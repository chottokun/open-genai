import { APIGatewayProxyEvent } from 'aws-lambda';
import { afterAll, beforeEach, describe, expect, test, vi } from 'vitest';

const { mockGetSignedUrl, mockResolveIdentityId, capturedPutKey } = vi.hoisted(() => ({
  mockGetSignedUrl: vi.fn(),
  mockResolveIdentityId: vi.fn(),
  capturedPutKey: { value: '' as string | undefined },
}));

vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: class {},
  PutObjectCommand: class {
    input: { Key?: string };
    constructor(input: { Key?: string }) {
      this.input = input;
      capturedPutKey.value = input.Key;
    }
  },
}));

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: mockGetSignedUrl,
}));

vi.mock('../../lambda/utils/cognitoIdentity', () => ({
  resolveIdentityId: mockResolveIdentityId,
}));

import { handler } from '../../lambda/getFileUploadSignedUrl';

const originalEnv = process.env;
beforeEach(() => {
  vi.clearAllMocks();
  capturedPutKey.value = '';
  process.env = { ...originalEnv, BUCKET_NAME: 'test-bucket' };
});

afterAll(() => {
  process.env = originalEnv;
});

function createEvent(
  body: Record<string, unknown>,
  headers: Record<string, string> = { Authorization: 'Bearer test-id-token' },
): APIGatewayProxyEvent {
  return {
    body: JSON.stringify(body),
    headers,
    pathParameters: {},
    requestContext: {
      authorizer: { claims: { sub: 'test-user' } },
    },
  } as unknown as APIGatewayProxyEvent;
}

describe('getFileUploadSignedUrl Lambda handler', () => {
  test('Identity Id プレフィックス付きのキーで署名付きURLを返す', async () => {
    mockResolveIdentityId.mockResolvedValue('us-east-1:id-123');
    mockGetSignedUrl.mockResolvedValue('https://s3.example.com/signed-url');

    const event = createEvent({ filename: 'test.png' });
    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    expect(result.body).toBe('https://s3.example.com/signed-url');
    expect(capturedPutKey.value).toMatch(
      /^us-east-1:id-123\/[0-9a-f-]{36}\/test\.png$/,
    );
  });

  test('Authorization ヘッダーが無い場合は 401', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const event = createEvent({ filename: 'test.png' }, {});
    const result = await handler(event);

    expect(result.statusCode).toBe(401);
    expect(JSON.parse(result.body)).toEqual({ error: 'Authorization header is required' });
    expect(mockGetSignedUrl).not.toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });

  test('エラー時は500を返す', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockResolveIdentityId.mockResolvedValue('us-east-1:id-123');
    mockGetSignedUrl.mockRejectedValue(new Error('S3 error'));

    const event = createEvent({ filename: 'test.png' });
    const result = await handler(event);

    expect(result.statusCode).toBe(500);
    expect(JSON.parse(result.body)).toEqual({
      error: 'サーバ側でエラーが発生しました。管理者へご連絡ください。',
    });

    consoleErrorSpy.mockRestore();
  });
});
