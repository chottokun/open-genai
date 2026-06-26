import { APIGatewayProxyEvent } from 'aws-lambda';
import { afterAll, beforeEach, describe, expect, type MockedFunction, test, vi } from 'vitest';
import { handler } from '../../lambda/listChats';
import { listChats } from '../../lambda/repository/chatRepository';

vi.mock('../../lambda/repository/chatRepository');

const mockedListChats = listChats as MockedFunction<typeof listChats>;

const originalEnv = process.env;
beforeEach(() => {
  vi.resetModules();
  process.env = { ...originalEnv };
});

afterAll(() => {
  process.env = originalEnv;
});

function createAPIGatewayProxyEvent(
  exclusiveStartKey?: string,
  userId?: string,
): APIGatewayProxyEvent {
  return {
    body: null,
    pathParameters: {},
    queryStringParameters: exclusiveStartKey ? { exclusiveStartKey } : null,
    requestContext: {
      authorizer: {
        claims: {
          sub: userId ?? 'test-user-id',
        },
      },
    },
  } as unknown as APIGatewayProxyEvent;
}

describe('listChats Lambda handler', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  test('チャット一覧を正常に取得できる', async () => {
    const userId = 'test-user-id';

    mockedListChats.mockResolvedValue({
      data: [
        {
          id: `user#${userId}`,
          createdDate: '1234567890',
          chatId: 'chat#id-1',
          title: 'チャット1',
          usecase: 'chat',
          updatedDate: '1234567890',
        },
      ],
      lastEvaluatedKey: undefined,
    });

    const event = createAPIGatewayProxyEvent(undefined, userId);
    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].title).toBe('チャット1');
    expect(mockedListChats).toHaveBeenCalledWith(userId, undefined);
  });

  test('exclusiveStartKeyを渡してページネーションできる', async () => {
    mockedListChats.mockResolvedValue({
      data: [],
      lastEvaluatedKey: undefined,
    });

    const event = createAPIGatewayProxyEvent('some-key');
    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    expect(mockedListChats).toHaveBeenCalledWith('test-user-id', 'some-key');
  });

  test('予期しないエラーが発生した場合は500エラーを返す', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    mockedListChats.mockRejectedValue(new Error('Unexpected error'));

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
