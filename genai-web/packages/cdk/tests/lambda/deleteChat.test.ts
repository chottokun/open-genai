import { APIGatewayProxyEvent } from 'aws-lambda';
import { afterAll, beforeEach, describe, expect, type MockedFunction, test, vi } from 'vitest';
import { handler } from '../../lambda/deleteChat';
import { deleteChat } from '../../lambda/repository/chatRepository';

vi.mock('../../lambda/repository/chatRepository');

const mockedDeleteChat = deleteChat as MockedFunction<typeof deleteChat>;

const originalEnv = process.env;
beforeEach(() => {
  vi.resetModules();
  process.env = { ...originalEnv };
});

afterAll(() => {
  process.env = originalEnv;
});

function createAPIGatewayProxyEvent(
  chatId?: string,
  userId?: string,
): APIGatewayProxyEvent {
  return {
    body: null,
    pathParameters: chatId ? { chatId } : {},
    requestContext: {
      authorizer: {
        claims: {
          sub: userId ?? 'test-user-id',
        },
      },
    },
  } as unknown as APIGatewayProxyEvent;
}

describe('deleteChat Lambda handler', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  test('チャットを正常に削除できる', async () => {
    const chatId = 'test-chat-id';
    const userId = 'test-user-id';

    mockedDeleteChat.mockResolvedValue(undefined);

    const event = createAPIGatewayProxyEvent(chatId, userId);
    const result = await handler(event);

    expect(result.statusCode).toBe(204);
    expect(result.body).toBe('');
    expect(mockedDeleteChat).toHaveBeenCalledWith(userId, chatId);
  });

  test('chatIdがない場合は400エラーを返す', async () => {
    const event = createAPIGatewayProxyEvent();
    const result = await handler(event);

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body)).toEqual({
      error: 'パラメータが不正です。',
    });
    expect(mockedDeleteChat).not.toHaveBeenCalled();
  });

  test('予期しないエラーが発生した場合は500エラーを返す', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    mockedDeleteChat.mockRejectedValue(new Error('Unexpected error'));

    const event = createAPIGatewayProxyEvent('test-chat-id');
    const result = await handler(event);

    expect(result.statusCode).toBe(500);
    expect(JSON.parse(result.body)).toEqual({
      error: 'サーバ側でエラーが発生しました。管理者へご連絡ください。',
    });
    expect(consoleErrorSpy).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });
});
