import type { APIGatewayProxyEvent } from 'aws-lambda';
import { describe, expect, test } from 'vitest';
import { HttpError } from '../../../lambda/utils/httpError';
import { requireSystemAdmin } from '../../../lambda/utils/requireSystemAdmin';

function createEventWithGroups(groups: string): APIGatewayProxyEvent {
  return {
    requestContext: {
      authorizer: {
        claims: {
          'cognito:groups': groups,
          sub: 'test-user-id',
        },
      },
    },
  } as unknown as APIGatewayProxyEvent;
}

describe('requireSystemAdmin', () => {
  test('SystemAdminGroupを含む場合、エラーをスローしない', () => {
    const event = createEventWithGroups('SystemAdminGroup');

    expect(() => requireSystemAdmin(event)).not.toThrow();
  });

  test('複数グループにSystemAdminGroupが含まれる場合、エラーをスローしない', () => {
    const event = createEventWithGroups('UserGroup,SystemAdminGroup,TeamAdminGroup');

    expect(() => requireSystemAdmin(event)).not.toThrow();
  });

  test('SystemAdminGroupを含まない場合、HttpError(403)をスローする', () => {
    const event = createEventWithGroups('UserGroup');

    expect(() => requireSystemAdmin(event)).toThrow(HttpError);
    expect(() => requireSystemAdmin(event)).toThrow('管理者ではないため利用できません。');
    try {
      requireSystemAdmin(event);
    } catch (error) {
      expect((error as HttpError).statusCode).toBe(403);
    }
  });

  test('グループが空の場合、HttpError(403)をスローする', () => {
    const event = createEventWithGroups('');

    expect(() => requireSystemAdmin(event)).toThrow(HttpError);
    try {
      requireSystemAdmin(event);
    } catch (error) {
      expect((error as HttpError).statusCode).toBe(403);
    }
  });
});
