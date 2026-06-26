import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { resolveIdentityId } from './utils/cognitoIdentity';

const ARTIFACTS_BUCKET_NAME = process.env.ARTIFACTS_BUCKET_NAME!;
const SIGNED_URL_EXPIRES_IN = 3600; // 1時間

/**
 * S3 URLをパースしてバケット名とキーを取得
 */
const parseS3Url = (s3Url: string): { bucketName: string; key: string } | null => {
  // s3://bucket-name/key 形式
  const s3Match = /^s3:\/\/(?<bucketName>[^/]+)\/(?<key>.+)$/.exec(s3Url);
  if (s3Match?.groups) {
    return {
      bucketName: s3Match.groups.bucketName,
      key: s3Match.groups.key,
    };
  }

  // https://bucket-name.s3.region.amazonaws.com/key 形式
  const httpsMatch = /^https:\/\/(?<bucketName>[^.]+)\.s3[^/]*\.amazonaws\.com\/(?<key>.+)$/.exec(
    s3Url,
  );
  if (httpsMatch?.groups) {
    return {
      bucketName: httpsMatch.groups.bucketName,
      key: httpsMatch.groups.key,
    };
  }

  return null;
};

/**
 * S3キーからCognito Identity IDを抽出
 * パス形式: {cognitoId}/{teamId}/{exAppId}/{createdDate}/...
 */
const extractCognitoIdFromKey = (key: string): string | null => {
  const parts = key.split('/');
  if (parts.length >= 1 && parts[0]) {
    return parts[0];
  }
  return null;
};

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const s3Url = event.queryStringParameters?.s3Url;

    if (!s3Url) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ message: 's3Url parameter is required' }),
      };
    }

    // S3 URLをパース
    const parsed = parseS3Url(decodeURIComponent(s3Url));
    if (!parsed) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ message: 'Invalid S3 URL format' }),
      };
    }

    const { bucketName, key } = parsed;

    // 許可されたバケットのみアクセス可能
    if (bucketName !== ARTIFACTS_BUCKET_NAME) {
      return {
        statusCode: 403,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ message: 'Access to this bucket is not allowed' }),
      };
    }

    // S3キーからCognito Identity IDを抽出
    const fileCognitoId = extractCognitoIdFromKey(key);
    if (!fileCognitoId) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ message: 'Invalid file path format' }),
      };
    }

    // リクエストのAuthorizationヘッダーからCognito Identity IDをサーバー側で解決
    const authHeader = event.headers?.Authorization ?? event.headers?.authorization;
    const idToken = authHeader?.replace(/^Bearer\s+/i, '');
    if (!idToken) {
      return {
        statusCode: 401,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ message: 'Authorization header is required' }),
      };
    }

    let requestCognitoId: string;
    try {
      requestCognitoId = await resolveIdentityId(idToken);
    } catch (error) {
      console.error('Failed to resolve Cognito Identity ID:', error);
      return {
        statusCode: 403,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ message: 'Failed to resolve identity' }),
      };
    }

    // ファイルの所有者とリクエスト者のCognito IDが一致するか確認
    if (fileCognitoId !== requestCognitoId) {
      return {
        statusCode: 403,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ message: 'Access denied: You can only access your own files' }),
      };
    }

    // Lambda自身の権限でS3にアクセス
    const client = new S3Client({});
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
      ResponseContentDisposition: 'attachment',
    });

    // 署名付きURLを生成（1時間有効）
    const signedUrl = await getSignedUrl(client, command, { expiresIn: SIGNED_URL_EXPIRES_IN });

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        data: signedUrl,
      }),
    };
  } catch (error) {
    console.error('Error generating signed URL:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ message: 'Internal Server Error' }),
    };
  }
};
