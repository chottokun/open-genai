import { APIGatewayProxyEvent } from 'aws-lambda';
import { afterAll, beforeEach, describe, expect, type MockedFunction, test, vi } from 'vitest';
import { handler } from '../../lambda/updateTeamUser';
import {
  findTeamUserById,
  listTeamUsers,
  updateTeamUser,
} from '../../lambda/repository/teamUserRepository';
import { addUserToGroup, findUserById, removeUserFromGroup } from '../../lambda/utils/cognitoApi';
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
const mockedUpdateTeamUser = updateTeamUser as MockedFunction<typeof updateTeamUser>;
const mockedFindUserById = findUserById as MockedFunction<typeof findUserById>;
const mockedAddUserToGroup = addUserToGroup as MockedFunction<typeof addUserToGroup>;
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

function createAPIGatewayProxyEvent(
  body: unknown | null,
  teamId?: string,
  userId?: string,
): APIGatewayProxyEvent {
  return {
    body: body ? JSON.stringify(body) : null,
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

describe('updateTeamUser Lambda handler', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  test('システム管理者がチームユーザーを管理者に昇格できる', async () => {
    const teamId = 'test-team-id';
    const userId = 'target-user-id';
    const now = Date.now().toString();

    mockedIsSystemAdmin.mockReturnValue(true);
    mockedIsTeamAdmin.mockResolvedValue(false);

    mockedFindUserById.mockResolvedValue({
      userId,
      email: 'user@example.com',
    });

    mockedFindTeamUserById.mockResolvedValue({
      teamId,
      userId,
      username: 'user@example.com',
      isAdmin: false,
      createdDate: now,
      updatedDate: now,
    });

    mockedListTeamUsers.mockResolvedValue({
      teamUsers: [
        {
          teamId,
          userId: 'admin-user-id',
          username: 'admin@example.com',
          isAdmin: true,
          createdDate: now,
          updatedDate: now,
        },
      ],
      lastEvaluatedKey: undefined,
    });

    mockedUpdateTeamUser.mockResolvedValue({
      teamId,
      userId,
      username: 'user@example.com',
      isAdmin: true,
      createdDate: now,
      updatedDate: now,
    });

    mockedAddUserToGroup.mockResolvedValue(undefined);

    const event = createAPIGatewayProxyEvent({ isAdmin: true }, teamId, userId);

    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    expect(mockedUpdateTeamUser).toHaveBeenCalledWith(teamId, userId, { isAdmin: true });
    expect(mockedAddUserToGroup).toHaveBeenCalledWith(userId, 'TeamAdminGroup');

    const body = JSON.parse(result.body);
    expect(body.isAdmin).toBe(true);
  });

  test('チーム管理者がチームユーザーを管理者から降格できる', async () => {
    const teamId = 'test-team-id';
    const userId = 'target-user-id';
    const now = Date.now().toString();

    mockedIsSystemAdmin.mockReturnValue(false);
    mockedIsTeamAdmin.mockResolvedValue(true);

    mockedFindUserById.mockResolvedValue({
      userId,
      email: 'user@example.com',
    });

    mockedFindTeamUserById.mockResolvedValue({
      teamId,
      userId,
      username: 'user@example.com',
      isAdmin: true,
      createdDate: now,
      updatedDate: now,
    });

    mockedListTeamUsers.mockResolvedValue({
      teamUsers: [
        {
          teamId,
          userId: 'admin-user-id',
          username: 'admin@example.com',
          isAdmin: true,
          createdDate: now,
          updatedDate: now,
        },
        {
          teamId,
          userId,
          username: 'user@example.com',
          isAdmin: true,
          createdDate: now,
          updatedDate: now,
        },
      ],
      lastEvaluatedKey: undefined,
    });

    mockedUpdateTeamUser.mockResolvedValue({
      teamId,
      userId,
      username: 'user@example.com',
      isAdmin: false,
      createdDate: now,
      updatedDate: now,
    });

    mockedRemoveUserFromGroup.mockResolvedValue(undefined);

    const event = createAPIGatewayProxyEvent({ isAdmin: false }, teamId, userId);

    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    expect(mockedUpdateTeamUser).toHaveBeenCalledWith(teamId, userId, { isAdmin: false });
    expect(mockedRemoveUserFromGroup).toHaveBeenCalledWith(userId, 'TeamAdminGroup');

    const body = JSON.parse(result.body);
    expect(body.isAdmin).toBe(false);
  });

  test('管理者でない場合は403エラーを返す', async () => {
    const teamId = 'test-team-id';
    const userId = 'target-user-id';

    mockedIsSystemAdmin.mockReturnValue(false);
    mockedIsTeamAdmin.mockResolvedValue(false);

    const event = createAPIGatewayProxyEvent({ isAdmin: true }, teamId, userId);

    const result = await handler(event);

    expect(result.statusCode).toBe(403);
    expect(JSON.parse(result.body)).toEqual({
      error: '管理者ではないため利用できません。',
    });
    expect(mockedUpdateTeamUser).not.toHaveBeenCalled();
  });

  test('ユーザーが見つからない場合は404エラーを返す', async () => {
    const teamId = 'test-team-id';
    const userId = 'nonexistent-user-id';

    mockedIsSystemAdmin.mockReturnValue(true);
    mockedIsTeamAdmin.mockResolvedValue(false);

    mockedFindUserById.mockResolvedValue(undefined);

    const event = createAPIGatewayProxyEvent({ isAdmin: true }, teamId, userId);

    const result = await handler(event);

    expect(result.statusCode).toBe(404);
    expect(JSON.parse(result.body)).toEqual({
      error: '該当ユーザがいません。',
    });
    expect(mockedUpdateTeamUser).not.toHaveBeenCalled();
  });

  test('チームにユーザーが所属していない場合は404エラーを返す', async () => {
    const teamId = 'test-team-id';
    const userId = 'target-user-id';

    mockedIsSystemAdmin.mockReturnValue(true);
    mockedIsTeamAdmin.mockResolvedValue(false);

    mockedFindUserById.mockResolvedValue({
      userId,
      email: 'user@example.com',
    });

    mockedFindTeamUserById.mockResolvedValue(null);

    const event = createAPIGatewayProxyEvent({ isAdmin: true }, teamId, userId);

    const result = await handler(event);

    expect(result.statusCode).toBe(404);
    expect(JSON.parse(result.body)).toEqual({
      error: '該当ユーザがいません。',
    });
    expect(mockedUpdateTeamUser).not.toHaveBeenCalled();
  });

  test('最後の管理者を降格しようとすると400エラーを返す', async () => {
    const teamId = 'test-team-id';
    const userId = 'last-admin-id';
    const now = Date.now().toString();

    mockedIsSystemAdmin.mockReturnValue(true);
    mockedIsTeamAdmin.mockResolvedValue(false);

    mockedFindUserById.mockResolvedValue({
      userId,
      email: 'lastadmin@example.com',
    });

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

    const event = createAPIGatewayProxyEvent({ isAdmin: false }, teamId, userId);

    const result = await handler(event);

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body)).toEqual({
      error: 'チーム管理者が0人になるため、削除できません。',
    });
    expect(mockedUpdateTeamUser).not.toHaveBeenCalled();
  });

  test('予期しないエラーが発生した場合は500エラーを返す', async () => {
    const teamId = 'test-team-id';
    const userId = 'target-user-id';
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    mockedIsSystemAdmin.mockReturnValue(true);
    mockedIsTeamAdmin.mockResolvedValue(false);
    mockedFindUserById.mockRejectedValue(new Error('Unexpected error'));

    const event = createAPIGatewayProxyEvent({ isAdmin: true }, teamId, userId);

    const result = await handler(event);

    expect(result.statusCode).toBe(500);
    expect(JSON.parse(result.body)).toEqual({
      error: 'サーバ側でエラーが発生しました。管理者へご連絡ください。',
    });
    expect(consoleErrorSpy).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });
});
