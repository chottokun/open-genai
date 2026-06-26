import { APIGatewayProxyEvent } from 'aws-lambda';
import { afterAll, beforeEach, describe, expect, type MockedFunction, test, vi } from 'vitest';
import { handler } from '../../lambda/updateSystemContextTitle';
import { updateSystemContextTitle } from '../../lambda/repository/systemContextRepository';

vi.mock('../../lambda/repository/systemContextRepository');

const mockedUpdateSystemContextTitle = updateSystemContextTitle as MockedFunction<
  typeof updateSystemContextTitle
>;

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
  systemContextId?: string,
  userId?: string,
): APIGatewayProxyEvent {
  return {
    body: body ? JSON.stringify(body) : null,
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

describe('updateSystemContextTitle Lambda handler', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  test('システムコンテキストタイトルを正常に更新できる', async () => {
    const userId = 'test-user-id';
    const systemContextId = 'test-system-context-id';
    const now = Date.now().toString();

    mockedUpdateSystemContextTitle.mockResolvedValue({
      id: `systemContext#${userId}`,
      createdDate: now,
      systemContextId: `systemContext#${systemContextId}`,
      systemContext: 'テストコンテキスト',
      systemContextTitle: '更新後のタイトル',
    });

    const event = createAPIGatewayProxyEvent(
      { title: '更新後のタイトル' },
      systemContextId,
      userId,
    );

    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.systemContext.systemContextTitle).toBe('更新後のタイトル');
    expect(mockedUpdateSystemContextTitle).toHaveBeenCalledWith(
      userId,
      systemContextId,
      '更新後のタイトル',
    );
  });

  test('systemContextIdがない場合は400エラーを返す', async () => {
    const event = createAPIGatewayProxyEvent({ title: '更新後のタイトル' });
    const result = await handler(event);

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body)).toEqual({
      error: 'パラメータが不正です。',
    });
    expect(mockedUpdateSystemContextTitle).not.toHaveBeenCalled();
  });

  test('タイトルが空の場合は400エラーを返す', async () => {
    const event = createAPIGatewayProxyEvent({ title: '' }, 'test-system-context-id');
    const result = await handler(event);

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body)).toEqual({
      error: 'タイトルは必須です。',
    });
    expect(mockedUpdateSystemContextTitle).not.toHaveBeenCalled();
  });

  test('タイトルが空白のみの場合は400エラーを返す', async () => {
    const event = createAPIGatewayProxyEvent({ title: '   ' }, 'test-system-context-id');
    const result = await handler(event);

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body)).toEqual({
      error: 'タイトルは必須です。',
    });
    expect(mockedUpdateSystemContextTitle).not.toHaveBeenCalled();
  });

  test('タイトルが文字列でない場合は400エラーを返す', async () => {
    const event = createAPIGatewayProxyEvent({ title: 123 }, 'test-system-context-id');
    const result = await handler(event);

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body)).toEqual({
      error: 'タイトルの形式が不正です。',
    });
    expect(mockedUpdateSystemContextTitle).not.toHaveBeenCalled();
  });

  test('予期しないエラーが発生した場合は500エラーを返す', async () => {
    const systemContextId = 'test-system-context-id';
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    mockedUpdateSystemContextTitle.mockRejectedValue(new Error('Unexpected error'));

    const event = createAPIGatewayProxyEvent(
      { title: '更新後のタイトル' },
      systemContextId,
    );

    const result = await handler(event);

    expect(result.statusCode).toBe(500);
    expect(JSON.parse(result.body)).toEqual({
      error: 'サーバ側でエラーが発生しました。管理者へご連絡ください。',
    });
    expect(consoleErrorSpy).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });
});
