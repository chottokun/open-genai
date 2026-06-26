import { APIGatewayProxyEvent } from 'aws-lambda';
import { afterAll, beforeEach, describe, expect, type MockedFunction, test, vi } from 'vitest';
import { handler } from '../../lambda/deleteTeamUser';
import {
  deleteTeamUser,
  findTeamUserById,
  listTeamUsers,
} from '../../lambda/repository/teamUserRepository';
import { removeUserFromGroup } from '../../lambda/utils/cognitoApi';
import * as teamRole from '../../lambda/utils/teamRole';

vi.mock('../../lambda/repository/teamUserRepository');
vi.mock('../../lambda/utils/cognitoApi');
vi.mock('../../lambda/utils/teamRole', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lambda/utils/teamRole')>();
  return {
    ...actual,
    isSystemAdmin: vi.fn(),
    isTeamAdmin: vi.fn(),
  };
});

const mockedFindTeamUserById = findTeamUserById as MockedFunction<typeof findTeamUserById>;
const mockedListTeamUsers = listTeamUsers as MockedFunction<typeof listTeamUsers>;
const mockedDeleteTeamUser = deleteTeamUser as MockedFunction<typeof deleteTeamUser>;
const mockedRemoveUserFromGroup = removeUserFromGroup as MockedFunction<
  typeof removeUserFromGroup
>;
const mockedIsSystemAdmin = teamRole.isSystemAdmin as MockedFunction<
  typeof teamRole.isSystemAdmin
>;
const mockedIsTeamAdmin = teamRole.isTeamAdmin as MockedFunction<
  typeof teamRole.isTeamAdmin
>;

const originalEnv = process.env;
beforeEach(() => {
  vi.resetModules();
  process.env = { ...originalEnv };
});

afterAll(() => {
  process.env = originalEnv;
});

function createAPIGatewayProxyEvent(teamId?: string, userId?: string): APIGatewayProxyEvent {
  return {
    body: null,
    pathParameters: { teamId, userId },
    requestContext: {
      authorizer: {
        claims: {
          'cognito:groups': 'SystemAdminGroup',
          sub: 'test-user-id',
        },
      },
    },
  } as unknown as APIGatewayProxyEvent;
}

describe('deleteTeamUser Lambda handler', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  test('システム管理者が一般ユーザーを正常に削除できる', async () => {
    const teamId = 'test-team-id';
    const userId = 'target-user-id';
    const now = Date.now().toString();

    mockedIsSystemAdmin.mockReturnValue(true);
    mockedIsTeamAdmin.mockResolvedValue(false);

    mockedFindTeamUserById.mockResolvedValue({
      teamId,
      userId,
      username: 'user@example.com',
      isAdmin: false,
      createdDate: now,
      updatedDate: now,
    });

    mockedDeleteTeamUser.mockResolvedValue(undefined);

    const event = createAPIGatewayProxyEvent(teamId, userId);

    const result = await handler(event);

    expect(result.statusCode).toBe(204);
    expect(result.body).toBe('');
    expect(mockedDeleteTeamUser).toHaveBeenCalledWith(teamId, userId);
    expect(mockedRemoveUserFromGroup).not.toHaveBeenCalled();
  });

  test('チーム管理者が一般ユーザーを正常に削除できる', async () => {
    const teamId = 'test-team-id';
    const userId = 'target-user-id';
    const now = Date.now().toString();

    mockedIsSystemAdmin.mockReturnValue(false);
    mockedIsTeamAdmin.mockResolvedValue(true);

    mockedFindTeamUserById.mockResolvedValue({
      teamId,
      userId,
      username: 'user@example.com',
      isAdmin: false,
      createdDate: now,
      updatedDate: now,
    });

    mockedDeleteTeamUser.mockResolvedValue(undefined);

    const event = createAPIGatewayProxyEvent(teamId, userId);

    const result = await handler(event);

    expect(result.statusCode).toBe(204);
    expect(mockedDeleteTeamUser).toHaveBeenCalledWith(teamId, userId);
  });

  test('管理者ユーザーを削除する場合はCognitoグループからも削除される', async () => {
    const teamId = 'test-team-id';
    const userId = 'admin-user-id';
    const now = Date.now().toString();

    mockedIsSystemAdmin.mockReturnValue(true);
    mockedIsTeamAdmin.mockResolvedValue(false);

    mockedFindTeamUserById.mockResolvedValue({
      teamId,
      userId,
      username: 'admin@example.com',
      isAdmin: true,
      createdDate: now,
      updatedDate: now,
    });

    mockedListTeamUsers.mockResolvedValue({
      teamUsers: [
        {
          teamId,
          userId,
          username: 'admin@example.com',
          isAdmin: true,
          createdDate: now,
          updatedDate: now,
        },
        {
          teamId,
          userId: 'another-admin-id',
          username: 'anotheradmin@example.com',
          isAdmin: true,
          createdDate: now,
          updatedDate: now,
        },
      ],
      lastEvaluatedKey: undefined,
    });

    mockedDeleteTeamUser.mockResolvedValue(undefined);
    mockedRemoveUserFromGroup.mockResolvedValue(undefined);

    const event = createAPIGatewayProxyEvent(teamId, userId);

    const result = await handler(event);

    expect(result.statusCode).toBe(204);
    expect(mockedDeleteTeamUser).toHaveBeenCalledWith(teamId, userId);
    expect(mockedRemoveUserFromGroup).toHaveBeenCalledWith(userId, 'TeamAdminGroup');
  });

  test('管理者でない場合は403エラーを返す', async () => {
    const teamId = 'test-team-id';
    const userId = 'target-user-id';

    mockedIsSystemAdmin.mockReturnValue(false);
    mockedIsTeamAdmin.mockResolvedValue(false);

    const event = createAPIGatewayProxyEvent(teamId, userId);

    const result = await handler(event);

    expect(result.statusCode).toBe(403);
    expect(JSON.parse(result.body)).toEqual({
      error: '管理者ではないため利用できません。',
    });
    expect(mockedDeleteTeamUser).not.toHaveBeenCalled();
  });

  test('削除対象のユーザーが見つからない場合は404エラーを返す', async () => {
    const teamId = 'test-team-id';
    const userId = 'nonexistent-user-id';

    mockedIsSystemAdmin.mockReturnValue(true);
    mockedIsTeamAdmin.mockResolvedValue(false);

    mockedFindTeamUserById.mockResolvedValue(null);

    const event = createAPIGatewayProxyEvent(teamId, userId);

    const result = await handler(event);

    expect(result.statusCode).toBe(404);
    expect(JSON.parse(result.body)).toEqual({
      error: '削除対象のユーザが見つかりませんでした。',
    });
    expect(mockedDeleteTeamUser).not.toHaveBeenCalled();
  });

  test('最後の管理者を削除しようとすると400エラーを返す', async () => {
    const teamId = 'test-team-id';
    const userId = 'last-admin-id';
    const now = Date.now().toString();

    mockedIsSystemAdmin.mockReturnValue(true);
    mockedIsTeamAdmin.mockResolvedValue(false);

    mockedFindTeamUserById.mockResolvedValue({
      teamId,
      userId,
      username: 'lastadmin@example.com',
      isAdmin: true,
      createdDate: now,
      updatedDate: now,
    });

    mockedListTeamUsers.mockResolvedValue({
      teamUsers: [
        {
          teamId,
          userId,
          username: 'lastadmin@example.com',
          isAdmin: true,
          createdDate: now,
          updatedDate: now,
        },
      ],
      lastEvaluatedKey: undefined,
    });

    const event = createAPIGatewayProxyEvent(teamId, userId);

    const result = await handler(event);

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body)).toEqual({
      error: 'チーム管理者が0人になるため、削除できません。',
    });
    expect(mockedDeleteTeamUser).not.toHaveBeenCalled();
  });

  test('予期しないエラーが発生した場合は500エラーを返す', async () => {
    const teamId = 'test-team-id';
    const userId = 'target-user-id';
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    mockedIsSystemAdmin.mockReturnValue(true);
    mockedIsTeamAdmin.mockResolvedValue(false);
    mockedFindTeamUserById.mockRejectedValue(new Error('Unexpected error'));

    const event = createAPIGatewayProxyEvent(teamId, userId);

    const result = await handler(event);

    expect(result.statusCode).toBe(500);
    expect(JSON.parse(result.body)).toEqual({
      error: 'サーバ側でエラーが発生しました。管理者へご連絡ください。',
    });
    expect(consoleErrorSpy).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });
});
