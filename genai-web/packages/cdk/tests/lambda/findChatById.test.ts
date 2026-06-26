import { APIGatewayProxyEvent } from 'aws-lambda';
import { afterAll, beforeEach, describe, expect, type MockedFunction, test, vi } from 'vitest';
import { handler } from '../../lambda/findChatById';
import { findChatById } from '../../lambda/repository/chatRepository';

vi.mock('../../lambda/repository/chatRepository');

const mockedFindChatById = findChatById as MockedFunction<typeof findChatById>;

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

describe('findChatById Lambda handler', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  test('チャットを正常に取得できる', async () => {
    const chatId = 'test-chat-id';
    const userId = 'test-user-id';

    mockedFindChatById.mockResolvedValue({
      id: `user#${userId}`,
      createdDate: '1234567890',
      chatId: `chat#${chatId}`,
      title: 'テストチャット',
      usecase: 'chat',
      updatedDate: '1234567890',
    });

    const event = createAPIGatewayProxyEvent(chatId, userId);
    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.chat.title).toBe('テストチャット');
    expect(mockedFindChatById).toHaveBeenCalledWith(userId, chatId);
  });

  test('チャットが見つからない場合はnullを返す', async () => {
    mockedFindChatById.mockResolvedValue(null);

    const event = createAPIGatewayProxyEvent('non-existent-id');
    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.chat).toBeNull();
  });

  test('chatIdがない場合は400エラーを返す', async () => {
    const event = createAPIGatewayProxyEvent();
    const result = await handler(event);

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body)).toEqual({
      error: 'パラメータが不正です。',
    });
    expect(mockedFindChatById).not.toHaveBeenCalled();
  });

  test('予期しないエラーが発生した場合は500エラーを返す', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    mockedFindChatById.mockRejectedValue(new Error('Unexpected error'));

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
