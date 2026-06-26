import { APIGatewayProxyEvent } from 'aws-lambda';
import { afterAll, beforeEach, describe, expect, test, vi } from 'vitest';

const { mockS3Send, mockResolveIdentityId } = vi.hoisted(() => ({
  mockS3Send: vi.fn(),
  mockResolveIdentityId: vi.fn(),
}));

vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: class {
    send = mockS3Send;
  },
  DeleteObjectCommand: vi.fn(),
}));

vi.mock('../../lambda/utils/cognitoIdentity', () => ({
  resolveIdentityId: mockResolveIdentityId,
}));

import { handler } from '../../lambda/deleteFile';

const originalEnv = process.env;
beforeEach(() => {
  vi.resetAllMocks();
  process.env = { ...originalEnv, BUCKET_NAME: 'test-bucket' };
});

afterAll(() => {
  process.env = originalEnv;
});

function createEvent(
  fileName?: string,
  headers: Record<string, string> = { Authorization: 'Bearer test-id-token' },
): APIGatewayProxyEvent {
  return {
    body: null,
    headers,
    pathParameters: fileName ? { fileName } : {},
    requestContext: {
      authorizer: { claims: { sub: 'test-user' } },
    },
  } as unknown as APIGatewayProxyEvent;
}

describe('deleteFile Lambda handler', () => {
  test('自分の新規キーは 204', async () => {
    mockResolveIdentityId.mockResolvedValue('us-east-1:owner');
    mockS3Send.mockResolvedValue({});

    const event = createEvent('us-east-1:owner/uuid/test.png');
    const result = await handler(event);

    expect(result.statusCode).toBe(204);
    expect(result.body).toBe('');
    expect(mockS3Send).toHaveBeenCalled();
  });

  test('URL エンコード済みパスパラメータもデコードして認可される', async () => {
    mockResolveIdentityId.mockResolvedValue('ap-northeast-1:7d8da787-0b98-cd76-e5f8-3cc5e0d32504');
    mockS3Send.mockResolvedValue({});

    // API Gateway から渡ってくる encodeURIComponent 後の生文字列を模す
    const event = createEvent(
      'ap-northeast-1%3A7d8da787-0b98-cd76-e5f8-3cc5e0d32504%2Fuuid%2Ftest.png',
    );
    const result = await handler(event);

    expect(result.statusCode).toBe(204);
    expect(mockS3Send).toHaveBeenCalled();
  });

  test('他人の新規キー削除は 403', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockResolveIdentityId.mockResolvedValue('us-east-1:me');

    const event = createEvent('us-east-1:attacker/uuid/test.png');
    const result = await handler(event);

    expect(result.statusCode).toBe(403);
    expect(JSON.parse(result.body).error).toContain('Access denied');
    expect(mockS3Send).not.toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });

  test('fileNameがない場合は400エラーを返す', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const event = createEvent();
    const result = await handler(event);

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body)).toEqual({ error: 'パラメータが不正です。' });
    expect(mockS3Send).not.toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });

  test('新規キーで Authorization ヘッダー無しは 401', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const event = createEvent('us-east-1:owner/uuid/test.png', {});
    const result = await handler(event);

    expect(result.statusCode).toBe(401);
    expect(mockS3Send).not.toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  test('S3エラー時は500を返す', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockResolveIdentityId.mockResolvedValue('us-east-1:owner');
    mockS3Send.mockRejectedValue(new Error('S3 delete error'));

    const event = createEvent('us-east-1:owner/uuid/test.png');
    const result = await handler(event);

    expect(result.statusCode).toBe(500);
    expect(JSON.parse(result.body)).toEqual({
      error: 'サーバ側でエラーが発生しました。管理者へご連絡ください。',
    });

    consoleErrorSpy.mockRestore();
  });
});
