import type { APIGatewayProxyEvent } from 'aws-lambda';
import { describe, expect, test } from 'vitest';
import { HttpError } from '../../../lambda/utils/httpError';
import { requirePathParam } from '../../../lambda/utils/requirePathParam';

function createEventWithPathParams(
  params: Record<string, string> | undefined,
): APIGatewayProxyEvent {
  return {
    pathParameters: params ?? null,
  } as unknown as APIGatewayProxyEvent;
}

describe('requirePathParam', () => {
  test('パスパラメータが存在する場合、値を返す', () => {
    const event = createEventWithPathParams({ teamId: 'team-123' });

    const result = requirePathParam(event, 'teamId');

    expect(result).toBe('team-123');
  });

  test('複数のパスパラメータから指定のものを取得できる', () => {
    const event = createEventWithPathParams({ teamId: 'team-1', userId: 'user-2' });

    expect(requirePathParam(event, 'teamId')).toBe('team-1');
    expect(requirePathParam(event, 'userId')).toBe('user-2');
  });

  test('パスパラメータが存在しない場合、HttpError(400)をスローする', () => {
    const event = createEventWithPathParams({ teamId: 'team-1' });

    expect(() => requirePathParam(event, 'exAppId')).toThrow(HttpError);
    expect(() => requirePathParam(event, 'exAppId')).toThrow('パラメータが不正です。');
    try {
      requirePathParam(event, 'exAppId');
    } catch (error) {
      expect((error as HttpError).statusCode).toBe(400);
    }
  });

  test('pathParametersがnullの場合、HttpError(400)をスローする', () => {
    const event = createEventWithPathParams(undefined);

    expect(() => requirePathParam(event, 'teamId')).toThrow(HttpError);
    try {
      requirePathParam(event, 'teamId');
    } catch (error) {
      expect((error as HttpError).statusCode).toBe(400);
    }
  });

  test('パスパラメータが空文字の場合、HttpError(400)をスローする', () => {
    const event = createEventWithPathParams({ teamId: '' });

    expect(() => requirePathParam(event, 'teamId')).toThrow(HttpError);
    try {
      requirePathParam(event, 'teamId');
    } catch (error) {
      expect((error as HttpError).statusCode).toBe(400);
    }
  });
});
