import { APIGatewayProxyEvent } from 'aws-lambda';
import { afterAll, beforeEach, describe, expect, type MockedFunction, test, vi } from 'vitest';
import { handler } from '../../lambda/listSystemContexts';
import { listSystemContexts } from '../../lambda/repository/systemContextRepository';

vi.mock('../../lambda/repository/systemContextRepository');

const mockedListSystemContexts = listSystemContexts as MockedFunction<typeof listSystemContexts>;

const originalEnv = process.env;
beforeEach(() => {
  vi.resetModules();
  process.env = { ...originalEnv };
});

afterAll(() => {
  process.env = originalEnv;
});

function createAPIGatewayProxyEvent(userId?: string): APIGatewayProxyEvent {
  return {
    body: null,
    pathParameters: {},
    requestContext: {
      authorizer: {
        claims: {
          sub: userId ?? 'test-user-id',
        },
      },
    },
  } as unknown as APIGatewayProxyEvent;
}

describe('listSystemContexts Lambda handler', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  test('システムコンテキスト一覧を正常に取得できる', async () => {
    const userId = 'test-user-id';
    const now = Date.now().toString();

    mockedListSystemContexts.mockResolvedValue([
      {
        id: `systemContext#${userId}`,
        createdDate: now,
        systemContextId: 'systemContext#id-1',
        systemContext: 'コンテキスト1',
        systemContextTitle: 'タイトル1',
      },
      {
        id: `systemContext#${userId}`,
        createdDate: now,
        systemContextId: 'systemContext#id-2',
        systemContext: 'コンテキスト2',
        systemContextTitle: 'タイトル2',
      },
    ]);

    const event = createAPIGatewayProxyEvent(userId);
    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body).toHaveLength(2);
    expect(body[0].systemContextTitle).toBe('タイトル1');
    expect(body[1].systemContextTitle).toBe('タイトル2');
    expect(mockedListSystemContexts).toHaveBeenCalledWith(userId);
  });

  test('システムコンテキストが0件の場合は空配列を返す', async () => {
    mockedListSystemContexts.mockResolvedValue([]);

    const event = createAPIGatewayProxyEvent();
    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body)).toEqual([]);
  });

  test('予期しないエラーが発生した場合は500エラーを返す', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    mockedListSystemContexts.mockRejectedValue(new Error('Unexpected error'));

    const event = createAPIGatewayProxyEvent();
    const result = await handler(event);

    expect(result.statusCode).toBe(500);
    expect(JSON.parse(result.body)).toEqual({
      error: 'サーバ側でエラーが発生しました。管理者へご連絡ください。',
    });
    expect(consoleErrorSpy).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });
});
