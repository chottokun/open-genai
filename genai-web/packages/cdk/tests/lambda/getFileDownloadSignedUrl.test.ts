import { APIGatewayProxyEvent } from 'aws-lambda';
import { afterAll, beforeEach, describe, expect, test, vi } from 'vitest';

const { mockGetSignedUrl, mockResolveIdentityId, capturedGetKey } = vi.hoisted(() => ({
  mockGetSignedUrl: vi.fn(),
  mockResolveIdentityId: vi.fn(),
  capturedGetKey: { value: '' as string | undefined, bucket: '' as string | undefined },
}));

vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: class {},
  GetObjectCommand: class {
    input: { Key?: string; Bucket?: string };
    constructor(input: { Key?: string; Bucket?: string }) {
      this.input = input;
      capturedGetKey.value = input.Key;
      capturedGetKey.bucket = input.Bucket;
    }
  },
}));

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: mockGetSignedUrl,
}));

vi.mock('../../lambda/utils/cognitoIdentity', () => ({
  resolveIdentityId: mockResolveIdentityId,
}));

import { handler } from '../../lambda/getFileDownloadSignedUrl';

const originalEnv = process.env;
beforeEach(() => {
  vi.clearAllMocks();
  capturedGetKey.value = '';
  capturedGetKey.bucket = '';
  process.env = { ...originalEnv, BUCKET_NAME: 'test-bucket' };
});

afterAll(() => {
  process.env = originalEnv;
});

function createEvent(
  queryParams: Record<string, string>,
  headers: Record<string, string> = { Authorization: 'Bearer test-id-token' },
): APIGatewayProxyEvent {
  return {
    body: null,
    headers,
    queryStringParameters: queryParams,
    pathParameters: {},
    requestContext: {
      authorizer: { claims: { sub: 'test-user' } },
    },
  } as unknown as APIGatewayProxyEvent;
}

describe('getFileDownloadSignedUrl Lambda handler', () => {
  test('自分のキーは 200 で署名URLを返す', async () => {
    mockResolveIdentityId.mockResolvedValue('us-east-1:owner');
    mockGetSignedUrl.mockResolvedValue('https://s3.example.com/download-url');

    const event = createEvent({
      filePrefix: 'us-east-1:owner/uuid/file.pdf',
    });
    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    expect(result.body).toBe('https://s3.example.com/download-url');
    expect(capturedGetKey.value).toBe('us-east-1:owner/uuid/file.pdf');
    expect(capturedGetKey.bucket).toBe('test-bucket');
  });

  test('他人のキーは 403', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockResolveIdentityId.mockResolvedValue('us-east-1:me');

    const event = createEvent({
      filePrefix: 'us-east-1:attacker/uuid/file.pdf',
    });
    const result = await handler(event);

    expect(result.statusCode).toBe(403);
    expect(JSON.parse(result.body).error).toContain('Access denied');
    expect(mockGetSignedUrl).not.toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });

  test('bucketName クエリは無視され env の BUCKET_NAME が使われる', async () => {
    mockResolveIdentityId.mockResolvedValue('us-east-1:owner');
    mockGetSignedUrl.mockResolvedValue('https://s3.example.com/download-url');

    const event = createEvent({
      bucketName: 'malicious-bucket',
      region: 'us-west-2',
      filePrefix: 'us-east-1:owner/uuid/file.pdf',
    });
    await handler(event);

    expect(capturedGetKey.bucket).toBe('test-bucket');
  });

  test('filePrefix が無い場合は 400', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const event = createEvent({});
    const result = await handler(event);

    expect(result.statusCode).toBe(400);
    consoleErrorSpy.mockRestore();
  });

  test('新規キーで Authorization ヘッダー無しは 401', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const event = createEvent(
      { filePrefix: 'us-east-1:owner/uuid/file.pdf' },
      {},
    );
    const result = await handler(event);

    expect(result.statusCode).toBe(401);
    consoleErrorSpy.mockRestore();
  });
});
