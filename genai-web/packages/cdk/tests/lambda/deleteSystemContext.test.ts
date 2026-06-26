import { APIGatewayProxyEvent } from 'aws-lambda';
import { afterAll, beforeEach, describe, expect, type MockedFunction, test, vi } from 'vitest';
import { handler } from '../../lambda/deleteSystemContext';
import { deleteSystemContext } from '../../lambda/repository/systemContextRepository';

vi.mock('../../lambda/repository/systemContextRepository');

const mockedDeleteSystemContext = deleteSystemContext as MockedFunction<typeof deleteSystemContext>;

const originalEnv = process.env;
beforeEach(() => {
  vi.resetModules();
  process.env = { ...originalEnv };
});

afterAll(() => {
  process.env = originalEnv;
});

function createAPIGatewayProxyEvent(
  systemContextId?: string,
  userId?: string,
): APIGatewayProxyEvent {
  return {
    body: null,
    pathParameters: systemContextId ? { systemContextId } : {},
    requestContext: {
      authorizer: {
        claims: {
          sub: userId ?? 'test-user-id',
        },
      },
    },
  } as unknown as APIGatewayProxyEvent;
}

describe('deleteSystemContext Lambda handler', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  test('システムコンテキストを正常に削除できる', async () => {
    const systemContextId = 'test-system-context-id';
    const userId = 'test-user-id';

    mockedDeleteSystemContext.mockResolvedValue(undefined);

    const event = createAPIGatewayProxyEvent(systemContextId, userId);
    const result = await handler(event);

    expect(result.statusCode).toBe(204);
    expect(result.body).toBe('');
    expect(mockedDeleteSystemContext).toHaveBeenCalledWith(userId, systemContextId);
  });

  test('systemContextIdがない場合は400エラーを返す', async () => {
    const event = createAPIGatewayProxyEvent();
    const result = await handler(event);

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body)).toEqual({
      error: 'パラメータが不正です。',
    });
    expect(mockedDeleteSystemContext).not.toHaveBeenCalled();
  });

  test('予期しないエラーが発生した場合は500エラーを返す', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    mockedDeleteSystemContext.mockRejectedValue(new Error('Unexpected error'));

    const event = createAPIGatewayProxyEvent('test-system-context-id');
    const result = await handler(event);

    expect(result.statusCode).toBe(500);
    expect(JSON.parse(result.body)).toEqual({
      error: 'サーバ側でエラーが発生しました。管理者へご連絡ください。',
    });
    expect(consoleErrorSpy).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });
});
