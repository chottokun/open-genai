import type { APIGatewayProxyEvent } from 'aws-lambda';
import { describe, expect, test, vi } from 'vitest';
import { createApiHandler } from '../../../lambda/utils/createApiHandler';
import { HttpError } from '../../../lambda/utils/httpError';

function createMinimalEvent(): APIGatewayProxyEvent {
  return {} as unknown as APIGatewayProxyEvent;
}

describe('createApiHandler', () => {
  test('正常なレスポンスを返す', async () => {
    const handler = createApiHandler(async () => ({
      statusCode: 200,
      body: { message: 'ok' },
    }));

    const result = await handler(createMinimalEvent());

    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body)).toEqual({ message: 'ok' });
    expect(result.headers).toEqual({
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    });
  });

  test('201などの任意のステータスコードを返せる', async () => {
    const handler = createApiHandler(async () => ({
      statusCode: 201,
      body: { id: 'new-id' },
    }));

    const result = await handler(createMinimalEvent());

    expect(result.statusCode).toBe(201);
    expect(JSON.parse(result.body)).toEqual({ id: 'new-id' });
  });

  test('HttpErrorが発生した場合、該当のステータスコードとメッセージを返す', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const handler = createApiHandler(async () => {
      throw new HttpError(400, 'バリデーションエラー');
    });

    const result = await handler(createMinimalEvent());

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body)).toEqual({ error: 'バリデーションエラー' });
    consoleSpy.mockRestore();
  });

  test('HttpError(403)の場合、403を返す', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const handler = createApiHandler(async () => {
      throw new HttpError(403, '権限がありません');
    });

    const result = await handler(createMinimalEvent());

    expect(result.statusCode).toBe(403);
    expect(JSON.parse(result.body)).toEqual({ error: '権限がありません' });
    consoleSpy.mockRestore();
  });

  test('HttpError(404)の場合、404を返す', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const handler = createApiHandler(async () => {
      throw new HttpError(404, '見つかりません');
    });

    const result = await handler(createMinimalEvent());

    expect(result.statusCode).toBe(404);
    expect(JSON.parse(result.body)).toEqual({ error: '見つかりません' });
    consoleSpy.mockRestore();
  });

  test('想定外のエラーが発生した場合、500エラーを返す', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const handler = createApiHandler(async () => {
      throw new Error('予期しないエラー');
    });

    const result = await handler(createMinimalEvent());

    expect(result.statusCode).toBe(500);
    expect(JSON.parse(result.body)).toEqual({
      error: 'サーバ側でエラーが発生しました。管理者へご連絡ください。',
    });
    consoleSpy.mockRestore();
  });

  test('文字列がスローされた場合も500エラーを返す', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const handler = createApiHandler(async () => {
      throw 'string error';
    });

    const result = await handler(createMinimalEvent());

    expect(result.statusCode).toBe(500);
    expect(JSON.parse(result.body)).toEqual({
      error: 'サーバ側でエラーが発生しました。管理者へご連絡ください。',
    });
    consoleSpy.mockRestore();
  });

  test('eventがハンドラー関数に渡される', async () => {
    const event = {
      pathParameters: { id: '123' },
    } as unknown as APIGatewayProxyEvent;

    const handler = createApiHandler(async (e) => ({
      statusCode: 200,
      body: { id: e.pathParameters!['id'] },
    }));

    const result = await handler(event);

    expect(JSON.parse(result.body)).toEqual({ id: '123' });
  });
});
