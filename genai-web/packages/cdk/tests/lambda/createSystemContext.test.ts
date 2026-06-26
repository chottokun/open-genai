import { APIGatewayProxyEvent } from 'aws-lambda';
import { afterAll, beforeEach, describe, expect, type MockedFunction, test, vi } from 'vitest';
import { handler } from '../../lambda/createSystemContext';
import { createSystemContext } from '../../lambda/repository/systemContextRepository';

vi.mock('../../lambda/repository/systemContextRepository');

const mockedCreateSystemContext = createSystemContext as MockedFunction<typeof createSystemContext>;

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
  userId?: string,
): APIGatewayProxyEvent {
  return {
    body: body ? JSON.stringify(body) : null,
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

describe('createSystemContext Lambda handler', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  test('システムコンテキストを正常に作成できる', async () => {
    const userId = 'test-user-id';
    const now = Date.now().toString();

    mockedCreateSystemContext.mockResolvedValue({
      id: `systemContext#${userId}`,
      createdDate: now,
      systemContextId: 'systemContext#new-id',
      systemContext: 'テストコンテキスト',
      systemContextTitle: 'テストタイトル',
    });

    const event = createAPIGatewayProxyEvent({
      systemContextTitle: 'テストタイトル',
      systemContext: 'テストコンテキスト',
    });

    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.messages.systemContextTitle).toBe('テストタイトル');
    expect(body.messages.systemContext).toBe('テストコンテキスト');
    expect(mockedCreateSystemContext).toHaveBeenCalledWith(
      userId,
      'テストタイトル',
      'テストコンテキスト',
    );
  });

  test('systemContextTitleが空の場合は400エラーを返す', async () => {
    const event = createAPIGatewayProxyEvent({
      systemContextTitle: '',
      systemContext: 'テストコンテキスト',
    });

    const result = await handler(event);

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body)).toEqual({
      error: 'システムコンテキストタイトルは必須です。',
    });
    expect(mockedCreateSystemContext).not.toHaveBeenCalled();
  });

  test('systemContextTitleが空白のみの場合は400エラーを返す', async () => {
    const event = createAPIGatewayProxyEvent({
      systemContextTitle: '   ',
      systemContext: 'テストコンテキスト',
    });

    const result = await handler(event);

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body)).toEqual({
      error: 'システムコンテキストタイトルは必須です。',
    });
    expect(mockedCreateSystemContext).not.toHaveBeenCalled();
  });

  test('systemContextが空の場合は400エラーを返す', async () => {
    const event = createAPIGatewayProxyEvent({
      systemContextTitle: 'テストタイトル',
      systemContext: '',
    });

    const result = await handler(event);

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body)).toEqual({
      error: 'システムコンテキストは必須です。',
    });
    expect(mockedCreateSystemContext).not.toHaveBeenCalled();
  });

  test('systemContextTitleが文字列でない場合は400エラーを返す', async () => {
    const event = createAPIGatewayProxyEvent({
      systemContextTitle: 123,
      systemContext: 'テストコンテキスト',
    });

    const result = await handler(event);

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body)).toEqual({
      error: 'システムコンテキストタイトルの形式が不正です。',
    });
    expect(mockedCreateSystemContext).not.toHaveBeenCalled();
  });

  test('systemContextが文字列でない場合は400エラーを返す', async () => {
    const event = createAPIGatewayProxyEvent({
      systemContextTitle: 'テストタイトル',
      systemContext: 123,
    });

    const result = await handler(event);

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body)).toEqual({
      error: 'システムコンテキストの形式が不正です。',
    });
    expect(mockedCreateSystemContext).not.toHaveBeenCalled();
  });

  test('予期しないエラーが発生した場合は500エラーを返す', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    mockedCreateSystemContext.mockRejectedValue(new Error('Unexpected error'));

    const event = createAPIGatewayProxyEvent({
      systemContextTitle: 'テストタイトル',
      systemContext: 'テストコンテキスト',
    });

    const result = await handler(event);

    expect(result.statusCode).toBe(500);
    expect(JSON.parse(result.body)).toEqual({
      error: 'サーバ側でエラーが発生しました。管理者へご連絡ください。',
    });
    expect(consoleErrorSpy).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });
});
