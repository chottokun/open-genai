import { Sha256 } from '@aws-crypto/sha256-js';
import { GetObjectCommand, ListObjectsV2Command, S3Client } from '@aws-sdk/client-s3';
import { AssumeRoleCommand, GetCallerIdentityCommand, STSClient } from '@aws-sdk/client-sts';
import { HttpRequest } from '@smithy/protocol-http';
import { SignatureV4 } from '@smithy/signature-v4';
import * as readline from 'readline';
import { Readable } from 'stream';
import * as zlib from 'zlib';
import { CognitoUserActivityLogItem, invocationUsageItem, RequestBody } from './interfaces';

const sts = new STSClient({ region: 'ap-northeast-1' });
const s3Client = new S3Client({ region: 'ap-northeast-1' });

// Lambda payload size limit is 6MB
// API Gateway's payload size limit is 10MB
const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB in bytes

function getUTF8ByteSize(str: string): number {
  return new TextEncoder().encode(str).length;
}

function splitIntoChunks(data: RequestBody, maxChunkSize: number): RequestBody[] {
  let currentChunk: RequestBody = {
    appEnv: data.appEnv,
    s3BucketName: data.s3BucketName,
    invocationUsages: [],
    cognitoUserActivityLogs: [],
    year: data.year,
    month: data.month,
    day: data.day,
  };
  const chunks: RequestBody[] = [];
  let currentChunkSize = getUTF8ByteSize(JSON.stringify(currentChunk));

  // Helper function to check if adding an item would exceed the chunk size
  const wouldExceedChunkSize = (item: any) => {
    return currentChunkSize + getUTF8ByteSize(JSON.stringify(item)) > maxChunkSize;
  };

  if (data.invocationUsages && data.invocationUsages.length > 0) {
    // Process invocationUsages
    for (const user of data.invocationUsages) {
      if (wouldExceedChunkSize(user)) {
        chunks.push(currentChunk);
        currentChunk = {
          ...currentChunk,
          invocationUsages: [],
        };
        currentChunkSize = getUTF8ByteSize(JSON.stringify(currentChunk));
      }
      currentChunk.invocationUsages.push(user);
      currentChunkSize += getUTF8ByteSize(JSON.stringify(user));
    }
  } else if (data.cognitoUserActivityLogs && data.cognitoUserActivityLogs.length > 0) {
    // Process cognitoUserActivityLogs
    for (const log of data.cognitoUserActivityLogs) {
      if (wouldExceedChunkSize(log)) {
        chunks.push(currentChunk);
        currentChunk = {
          ...currentChunk,
          cognitoUserActivityLogs: [],
        };
        currentChunkSize = getUTF8ByteSize(JSON.stringify(currentChunk));
      }
      currentChunk.cognitoUserActivityLogs!.push(log);
      currentChunkSize += getUTF8ByteSize(JSON.stringify(log));
    }
  }

  chunks.push(currentChunk);

  return chunks;
}

interface ChunkResult {
  data: RequestBody[];
  message: string;
}

async function sendChunks(
  chunks: RequestBody[],
  url: string,
  credentials: any,
): Promise<ChunkResult[]> {
  const sendChunk = async (chunk: RequestBody): Promise<ChunkResult> => {
    const requestBody = JSON.stringify(chunk);

    const signer = new SignatureV4({
      credentials,
      region: 'ap-northeast-1',
      service: 'execute-api',
      sha256: Sha256,
    });

    const endpointUrl = url;

    const parsedUrl = new URL(endpointUrl);
    const request = new HttpRequest({
      hostname: parsedUrl.host,
      method: 'POST',
      headers: {
        host: parsedUrl.host,
        'content-type': 'application/json',
      },
      path: parsedUrl.pathname,
      body: requestBody,
    });

    const signedRequest = await signer.sign(request);

    const response = await fetch(endpointUrl, {
      method: 'POST',
      headers: signedRequest.headers,
      body: requestBody,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! response is not ok, response: ${errorText}`);
    }

    return (await response.json()) as ChunkResult;
  };

  try {
    const results = await Promise.all(chunks.map(sendChunk));
    return results;
  } catch (error) {
    console.error('Error occurred while processing chunks:', error);
    throw error;
  }
}

async function getS3CognitoLogs(
  s3BucketName: string,
  startDate: string,
  endDate: string,
  s3Prefix: string,
): Promise<CognitoUserActivityLogItem[]> {
  // Extract year/month/day from startDate (format: YYYY/MM/DD)
  const [year, month, day] = startDate.split('/');
  const datePrefix = `${s3Prefix}${year}/${month}/${day}/`;

  // Pagination handling for ListObjectsV2Command
  let allObjects: any[] = [];
  let continuationToken: string | undefined;
  let pageCount = 0;

  do {
    const listParams = {
      Bucket: s3BucketName,
      Prefix: datePrefix,
      ContinuationToken: continuationToken,
    };

    const listCommand = new ListObjectsV2Command(listParams);
    const listedObjects = await s3Client.send(listCommand);

    pageCount++;

    if (listedObjects.Contents) {
      allObjects = allObjects.concat(listedObjects.Contents);
    }

    continuationToken = listedObjects.NextContinuationToken;
  } while (continuationToken);

  const extractDate = (key: string): string | null => {
    const regex = /(\d{4}\/\d{2}\/\d{2})/;
    const match = key.match(regex);
    return match ? match[1] : null;
  }; // YYYY/MM/DD in string

  const dateStringToDate = (dateString: string): Date => {
    const [year, month, day] = dateString.split('/').map(Number);
    return new Date(year, month - 1, day);
  }; // Convert string to Date

  const filteredObjects = allObjects.filter((object) => {
    const key = object.Key ?? '';
    if (!key.endsWith('.gz')) return false;

    const objectDateString = extractDate(key);
    if (!objectDateString) return false;

    const objectDate = dateStringToDate(objectDateString);
    const start = dateStringToDate(startDate);
    const end = dateStringToDate(endDate);

    return objectDate >= start && objectDate < end;
  });

  const cognitoUserActivityLogs: CognitoUserActivityLogItem[] = [];

  for (const object of filteredObjects || []) {
    if (object.Key) {
      const getParams = {
        Bucket: s3BucketName,
        Key: object.Key,
      };

      const getCommand = new GetObjectCommand(getParams);
      const response = await s3Client.send(getCommand);

      if (response.Body instanceof Readable) {
        try {
          // Gunzip the stream
          const gunzip = zlib.createGunzip();
          const readStream = response.Body.pipe(gunzip);

          // Create readline interface
          const rl = readline.createInterface({
            input: readStream,
            crlfDelay: Infinity,
          });

          // Process each line
          for await (const line of rl) {
            if (line.trim()) {
              try {
                const jsonPart = line.substring(line.indexOf('{'));
                const parsedData = JSON.parse(jsonPart);
                cognitoUserActivityLogs.push(parsedData);
              } catch (parseError) {
                console.error(`Error parsing line: ${line}`, parseError);
              }
            }
          }
        } catch (error) {
          console.error(`Error processing file:`, error);
        }
      }
    }
  }

  return cognitoUserActivityLogs;
}

async function getS3Data(
  s3BucketName: string,
  startDate: string,
  endDate: string,
  s3Prefix: string,
): Promise<invocationUsageItem[]> {
  // Extract year/month/day from startDate (format: YYYY/MM/DD)
  const [year, month, day] = startDate.split('/');
  const datePrefix = `${s3Prefix}${year}/${month}/${day}/`;

  // Pagination handling for ListObjectsV2Command
  let allObjects: any[] = [];
  let continuationToken: string | undefined;
  let pageCount = 0;

  do {
    const listParams = {
      Bucket: s3BucketName,
      Prefix: datePrefix,
      ContinuationToken: continuationToken,
    };

    const listCommand = new ListObjectsV2Command(listParams);
    const listedObjects = await s3Client.send(listCommand);

    pageCount++;

    if (listedObjects.Contents) {
      allObjects = allObjects.concat(listedObjects.Contents);
    }

    continuationToken = listedObjects.NextContinuationToken;
  } while (continuationToken);

  const extractDate = (key: string): string | null => {
    const regex = /(\d{4}\/\d{2}\/\d{2})/;
    const match = key.match(regex);
    return match ? match[1] : null;
  }; // YYYY/MM/DD in string

  const dateStringToDate = (dateString: string): Date => {
    const [year, month, day] = dateString.split('/').map(Number);
    return new Date(year, month - 1, day);
  }; // Convert string to Date

  const filteredObjects = allObjects.filter((object) => {
    const key = object.Key ?? '';
    if (!key.endsWith('.json.gz')) return false; // Step 1

    const objectDateString = extractDate(key); // Step 2
    if (!objectDateString) return false;

    const objectDate = dateStringToDate(objectDateString); // Step 3
    const start = dateStringToDate(startDate);
    const end = dateStringToDate(endDate);

    return objectDate >= start && objectDate < end;
  });

  const invocationUsages: invocationUsageItem[] = [];

  for (const object of filteredObjects || []) {
    if (object.Key) {
      const getParams = {
        Bucket: s3BucketName,
        Key: object.Key,
      };

      const getCommand = new GetObjectCommand(getParams);
      const response = await s3Client.send(getCommand);

      if (response.Body instanceof Readable) {
        try {
          // Gunzip the stream
          const gunzip = zlib.createGunzip();
          const readStream = response.Body.pipe(gunzip);

          // Create readline interface
          const rl = readline.createInterface({
            input: readStream,
            crlfDelay: Infinity,
          });

          // Process each line
          for await (const line of rl) {
            if (line.trim()) {
              try {
                const parsedData = JSON.parse(line);
                if (parsedData.NewImage) {
                  invocationUsages.push(parsedData.NewImage);
                } else {
                  invocationUsages.push(parsedData);
                }
              } catch (parseError) {
                console.error(`Error parsing line: ${line}`, parseError);
              }
            }
          }
        } catch (error) {
          console.error(`Error processing file:`, error);
        }
      }
    }
  }

  return invocationUsages;
}

export const handler = async (event: any) => {
  const appEnv = process.env.APP_ENV;
  const destinationAccountId = process.env.DESTINATION_ACCOUNT_ID;
  const destinationEndpointUrl = process.env.DESTINATION_ENDPOINT_URL;
  const destinationRoleArn = process.env.DESTINATION_ROLE_ARN;
  const s3BucketName = process.env.S3_BUCKET_NAME;
  const s3Prefix = process.env.S3_PREFIX;
  const logType = process.env.LOG_TYPE;

  if (!destinationAccountId || !destinationEndpointUrl || !destinationRoleArn) {
    console.error('Missing required environment variables', {
      destinationAccountId: !!destinationAccountId,
      destinationEndpointUrl: !!destinationEndpointUrl,
      destinationRoleArn: !!destinationRoleArn,
    });
    return {
      statusCode: 400,
      body: 'Required environment variables are not provided.',
    };
  }

  try {
    let invocationUsages: invocationUsageItem[] = [];
    let cognitoUserActivityLogs: CognitoUserActivityLogItem[] = [];
    let year = '';
    let month = '';
    let day = '';
    if (s3BucketName && s3Prefix) {
      // どの環境でも24時間対応する確実な方法
      const getJSTYesterday = () => {
        // JST基準での現在時刻を取得
        const now = new Date();
        const jstString = now.toLocaleString('ja-JP', {
          timeZone: 'Asia/Tokyo',
        });
        const jstDate = new Date(jstString);

        // JST基準で1日前に設定
        jstDate.setDate(jstDate.getDate() - 1);

        // yyyy/mm/dd形式で返す
        return jstDate.toLocaleDateString('ja-JP', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        });
      };

      const startDate = getJSTYesterday();
      const endDate = new Date().toLocaleDateString('ja-JP', {
        timeZone: 'Asia/Tokyo',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }); // JST基準で今の日付

      year = startDate.split('/')[0];
      month = startDate.split('/')[1];
      day = startDate.split('/')[2];

      if (logType === 'cognito') {
        cognitoUserActivityLogs = await getS3CognitoLogs(
          s3BucketName,
          startDate,
          endDate,
          s3Prefix,
        );
      } else {
        invocationUsages = await getS3Data(s3BucketName, startDate, endDate, s3Prefix);
      }
    } else {
      return {
        statusCode: 500,
        body: JSON.stringify({
          message: 'Error: No S3 bucket name provided. env:' + JSON.stringify(process.env, null, 2),
        }),
      };
    }

    const requestBody: RequestBody = {
      appEnv: appEnv || '',
      s3BucketName: s3BucketName,
      invocationUsages: invocationUsages,
      cognitoUserActivityLogs: cognitoUserActivityLogs,
      year: year,
      month: month,
      day: day,
    };

    const chunks = splitIntoChunks(requestBody, CHUNK_SIZE);

    // Get source account ID from STS
    const callerIdentity = await sts.send(new GetCallerIdentityCommand({}));
    const sourceAccountId = callerIdentity.Account!;
    const timestamp = Math.floor(Date.now() / 1000);

    const assumeRoleResponse = await sts.send(
      new AssumeRoleCommand({
        RoleArn: destinationRoleArn,
        RoleSessionName: `source-${sourceAccountId}-${timestamp}`,
      }),
    );

    const credentials = {
      accessKeyId: assumeRoleResponse.Credentials!.AccessKeyId!,
      secretAccessKey: assumeRoleResponse.Credentials!.SecretAccessKey!,
      sessionToken: assumeRoleResponse.Credentials!.SessionToken,
    };

    await sendChunks(chunks, destinationEndpointUrl!, credentials);

    const successResponse = {
      statusCode: 200,
    };

    return successResponse;
  } catch (error: any) {
    console.error('Lambda handler error', {
      errorMessage: error.message,
      errorStack: error.stack,
      errorName: error.name,
    });

    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Error calling destination API',
        error: error.message,
      }),
    };
  }
};
