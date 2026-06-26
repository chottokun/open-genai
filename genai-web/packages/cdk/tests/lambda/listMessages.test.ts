import { APIGatewayProxyEvent } from 'aws-lambda';
import { afterAll, beforeEach, describe, expect, type MockedFunction, test, vi } from 'vitest';
import { handler } from '../../lambda/listMessages';
import { findChatById } from '../../lambda/repository/chatRepository';
import { listMessages } from '../../lambda/repository/messageRepository';

vi.mock('../../lambda/repository/chatRepository');
vi.mock('../../lambda/repository/messageRepository');

const mockedFindChatById = findChatById as MockedFunction<typeof findChatById>;
const mockedListMessages = listMessages as MockedFunction<typeof listMessages>;

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

describe('listMessages Lambda handler', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  test('メッセージ一覧を正常に取得できる', async () => {
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

    mockedListMessages.mockResolvedValue([
      {
        id: `chat#${chatId}`,
        createdDate: '1234567890#0',
        messageId: 'msg-1',
        role: 'user',
        content: 'こんにちは',
        usecase: 'chat',
        userId: `user#${userId}`,
        feedback: '',
      },
      {
        id: `chat#${chatId}`,
        createdDate: '1234567891#0',
        messageId: 'msg-2',
        role: 'assistant',
        content: 'はい、こんにちは',
        usecase: 'chat',
        userId: `user#${userId}`,
        feedback: '',
      },
    ]);

    const event = createAPIGatewayProxyEvent(chatId, userId);
    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.messages).toHaveLength(2);
    expect(body.messages[0].content).toBe('こんにちは');
    expect(mockedListMessages).toHaveBeenCalledWith(chatId);
  });

  test('チャットが見つからない場合は403エラーを返す', async () => {
    mockedFindChatById.mockResolvedValue(null);

    const event = createAPIGatewayProxyEvent('non-existent-id');
    const result = await handler(event);

    expect(result.statusCode).toBe(403);
    expect(JSON.parse(result.body)).toEqual({
      error: 'Forbidden',
    });
    expect(mockedListMessages).not.toHaveBeenCalled();
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
