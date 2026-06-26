import { Sha256 } from '@aws-crypto/sha256-js';
import {
  CognitoIdentityProviderClient,
  ListUsersCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { AssumeRoleCommand, GetCallerIdentityCommand, STSClient } from '@aws-sdk/client-sts';
import { HttpRequest } from '@smithy/protocol-http';
import { SignatureV4 } from '@smithy/signature-v4';
import { RequestBody, UserPoolUsersItem } from './interfaces';

const sts = new STSClient({ region: 'ap-northeast-1' });
const cognitoClient = new CognitoIdentityProviderClient({
  region: 'ap-northeast-1',
});

// API Gateway's payload size limit is 10MB
const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB in bytes

function getUTF8ByteSize(str: string): number {
  return new TextEncoder().encode(str).length;
}

function splitIntoChunks(data: RequestBody, maxChunkSize: number): RequestBody[] {
  let currentChunk: RequestBody = {
    appEnv: data.appEnv,
    userPoolId: data.userPoolId,
    userPoolUsers: { Users: [] },
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

  // Process userPoolUsers
  for (const item of data.userPoolUsers.Users) {
    if (wouldExceedChunkSize(item)) {
      if (currentChunk.userPoolUsers.Users.length > 0) {
        chunks.push(currentChunk);
        currentChunk = {
          ...currentChunk,
          userPoolUsers: { Users: [] },
        };
        currentChunkSize = getUTF8ByteSize(JSON.stringify(currentChunk));
      }
    }
    currentChunk.userPoolUsers.Users.push(item);
    currentChunkSize += getUTF8ByteSize(JSON.stringify(item));
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

    const parsedUrl = new URL(url);
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

    const response = await fetch(url, {
      method: 'POST',
      headers: signedRequest.headers,
      body: requestBody,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error response:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
      });
      throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
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

export const handler = async (event: any) => {
  const appEnv = process.env.APP_ENV;
  const destinationAccountId = process.env.DESTINATION_ACCOUNT_ID;
  const destinationEndpointUrl = process.env.DESTINATION_ENDPOINT_URL;
  const destinationRoleArn = process.env.DESTINATION_ROLE_ARN;
  const userPoolId = process.env.USER_POOL_ID;

  if (!destinationAccountId || !destinationEndpointUrl || !destinationRoleArn || !userPoolId) {
    console.error('Missing required environment variables');
    return {
      statusCode: 400,
      body: 'Required environment variables are not provided.',
    };
  }

  try {
    const listUsersCommand = new ListUsersCommand({
      UserPoolId: userPoolId,
      Limit: 60, // Adjust as needed
      // Filter: `cognito:user_status = "CONFIRMED"`,
      PaginationToken: undefined,
    });

    let allUsers: any[] = [];
    let paginationToken: string | undefined;

    do {
      if (paginationToken) {
        listUsersCommand.input.PaginationToken = paginationToken;
      }

      const usersResponse = await cognitoClient.send(listUsersCommand);

      if (usersResponse.Users) {
        allUsers = allUsers.concat(usersResponse.Users);
      }
      paginationToken = usersResponse.PaginationToken;
    } while (paginationToken);

    const userPoolUsers: UserPoolUsersItem = { Users: allUsers };

    // Convert timestamps to Date objects
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

    const year = startDate.split('/')[0];
    const month = startDate.split('/')[1];
    const day = startDate.split('/')[2];

    const requestBody = {
      appEnv: appEnv,
      userPoolId: userPoolId,
      userPoolUsers: userPoolUsers,
      year: year,
      month: month,
      day: day,
    } as RequestBody;

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

    await sendChunks(chunks, destinationEndpointUrl, credentials);

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
