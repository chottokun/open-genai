import { APIGatewayProxyEvent } from 'aws-lambda';
import { afterAll, beforeEach, describe, expect, type MockedFunction, test, vi } from 'vitest';
import { handler } from '../../lambda/updateTitle';
import { findChatById, setChatTitle } from '../../lambda/repository/chatRepository';

vi.mock('../../lambda/repository/chatRepository');

const mockedFindChatById = findChatById as MockedFunction<typeof findChatById>;
const mockedSetChatTitle = setChatTitle as MockedFunction<typeof setChatTitle>;

const originalEnv = process.env;
beforeEach(() => {
  vi.resetModules();
  process.env = { ...originalEnv };
});

afterAll(() => {
  process.env = originalEnv;
});

function createAPIGatewayProxyEvent(
  body: unknown | null,
  chatId?: string,
  userId?: string,
): APIGatewayProxyEvent {
  return {
    body: body ? JSON.stringify(body) : null,
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

describe('updateTitle Lambda handler', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  test('チャットタイトルを正常に更新できる', async () => {
    const chatId = 'test-chat-id';
    const userId = 'test-user-id';

    mockedFindChatById.mockResolvedValue({
      id: `user#${userId}`,
      createdDate: '1234567890',
      chatId: `chat#${chatId}`,
      title: '古いタイトル',
      usecase: 'chat',
      updatedDate: '1234567890',
    });

    mockedSetChatTitle.mockResolvedValue({
      id: `user#${userId}`,
      createdDate: '1234567890',
      chatId: `chat#${chatId}`,
      title: '新しいタイトル',
      usecase: 'chat',
      updatedDate: '1234567891',
    });

    const event = createAPIGatewayProxyEvent({ title: '新しいタイトル' }, chatId, userId);
    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.chat.title).toBe('新しいタイトル');
    expect(mockedSetChatTitle).toHaveBeenCalledWith(`user#${userId}`, '1234567890', '新しいタイトル');
  });

  test('チャットが見つからない場合は404エラーを返す', async () => {
    mockedFindChatById.mockResolvedValue(null);

    const event = createAPIGatewayProxyEvent({ title: '新しいタイトル' }, 'non-existent-id');
    const result = await handler(event);

    expect(result.statusCode).toBe(404);
    expect(JSON.parse(result.body)).toEqual({
      error: 'チャットが見つかりません。',
    });
    expect(mockedSetChatTitle).not.toHaveBeenCalled();
  });

  test('chatIdがない場合は400エラーを返す', async () => {
    const event = createAPIGatewayProxyEvent({ title: '新しいタイトル' });
    const result = await handler(event);

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body)).toEqual({
      error: 'パラメータが不正です。',
    });
    expect(mockedFindChatById).not.toHaveBeenCalled();
  });

  test('タイトルが空の場合は400エラーを返す', async () => {
    mockedFindChatById.mockResolvedValue({
      id: 'user#test-user-id',
      createdDate: '1234567890',
      chatId: 'chat#test-chat-id',
      title: '古いタイトル',
      usecase: 'chat',
      updatedDate: '1234567890',
    });

    const event = createAPIGatewayProxyEvent({ title: '' }, 'test-chat-id');
    const result = await handler(event);

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body)).toEqual({
      error: 'タイトルは必須です。',
    });
    expect(mockedSetChatTitle).not.toHaveBeenCalled();
  });

  test('タイトルが空白のみの場合は400エラーを返す', async () => {
    mockedFindChatById.mockResolvedValue({
      id: 'user#test-user-id',
      createdDate: '1234567890',
      chatId: 'chat#test-chat-id',
      title: '古いタイトル',
      usecase: 'chat',
      updatedDate: '1234567890',
    });

    const event = createAPIGatewayProxyEvent({ title: '   ' }, 'test-chat-id');
    const result = await handler(event);

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body)).toEqual({
      error: 'タイトルは必須です。',
    });
    expect(mockedSetChatTitle).not.toHaveBeenCalled();
  });

  test('タイトルが文字列でない場合は400エラーを返す', async () => {
    mockedFindChatById.mockResolvedValue({
      id: 'user#test-user-id',
      createdDate: '1234567890',
      chatId: 'chat#test-chat-id',
      title: '古いタイトル',
      usecase: 'chat',
      updatedDate: '1234567890',
    });

    const event = createAPIGatewayProxyEvent({ title: 123 }, 'test-chat-id');
    const result = await handler(event);

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body)).toEqual({
      error: 'タイトルの形式が不正です。',
    });
    expect(mockedSetChatTitle).not.toHaveBeenCalled();
  });

  test('予期しないエラーが発生した場合は500エラーを返す', async () => {
    const chatId = 'test-chat-id';
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    mockedFindChatById.mockRejectedValue(new Error('Unexpected error'));

    const event = createAPIGatewayProxyEvent({ title: '新しいタイトル' }, chatId);
    const result = await handler(event);

    expect(result.statusCode).toBe(500);
    expect(JSON.parse(result.body)).toEqual({
      error: 'サーバ側でエラーが発生しました。管理者へご連絡ください。',
    });
    expect(consoleErrorSpy).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });
});
