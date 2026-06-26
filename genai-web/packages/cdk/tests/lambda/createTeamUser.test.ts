import { APIGatewayProxyEvent } from 'aws-lambda';
import { afterAll, beforeEach, describe, expect, type MockedFunction, test, vi } from 'vitest';
import { handler } from '../../lambda/createTeamUser';
import { createTeamUser } from '../../lambda/repository/teamUserRepository';
import { addUserToGroup, findUserByEmail } from '../../lambda/utils/cognitoApi';
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

const mockedCreateTeamUser = createTeamUser as MockedFunction<typeof createTeamUser>;
const mockedFindUserByEmail = findUserByEmail as MockedFunction<typeof findUserByEmail>;
const mockedAddUserToGroup = addUserToGroup as MockedFunction<typeof addUserToGroup>;
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
): APIGatewayProxyEvent {
  return {
    body: body ? JSON.stringify(body) : null,
    pathParameters: teamId ? { teamId } : {},
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

describe('createTeamUser Lambda handler', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  test('システム管理者がチームユーザーを正常に作成できる', async () => {
    const teamId = 'test-team-id';
    const userId = 'new-user-id';
    const email = 'newuser@example.com';
    const now = Date.now().toString();

    mockedIsSystemAdmin.mockReturnValue(true);
    mockedIsTeamAdmin.mockResolvedValue(false);

    mockedFindUserByEmail.mockResolvedValue({
      userId,
      email,
    });

    mockedAddUserToGroup.mockResolvedValue(undefined);

    mockedCreateTeamUser.mockResolvedValue({
      teamId,
      userId,
      username: email,
      isAdmin: false,
      createdDate: now,
      updatedDate: now,
    });

    const event = createAPIGatewayProxyEvent(
      {
        email,
        isAdmin: false,
      },
      teamId,
    );

    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    expect(mockedFindUserByEmail).toHaveBeenCalledWith(email);
    expect(mockedAddUserToGroup).toHaveBeenCalledWith(userId, 'UserGroup');
    expect(mockedCreateTeamUser).toHaveBeenCalledWith(teamId, userId, email, false);

    const body = JSON.parse(result.body);
    expect(body.teamId).toBe(teamId);
    expect(body.userId).toBe(userId);
    expect(body.isAdmin).toBe(false);
  });

  test('チーム管理者がチームユーザーを正常に作成できる', async () => {
    const teamId = 'test-team-id';
    const userId = 'new-user-id';
    const email = 'newuser@example.com';
    const now = Date.now().toString();

    mockedIsSystemAdmin.mockReturnValue(false);
    mockedIsTeamAdmin.mockResolvedValue(true);

    mockedFindUserByEmail.mockResolvedValue({
      userId,
      email,
    });

    mockedAddUserToGroup.mockResolvedValue(undefined);

    mockedCreateTeamUser.mockResolvedValue({
      teamId,
      userId,
      username: email,
      isAdmin: false,
      createdDate: now,
      updatedDate: now,
    });

    const event = createAPIGatewayProxyEvent(
      {
        email,
        isAdmin: false,
      },
      teamId,
    );

    const result = await handler(event);

    expect(result.statusCode).toBe(200);
  });

  test('チーム管理者として作成する場合はTeamAdminGroupに追加される', async () => {
    const teamId = 'test-team-id';
    const userId = 'new-admin-id';
    const email = 'newadmin@example.com';
    const now = Date.now().toString();

    mockedIsSystemAdmin.mockReturnValue(true);
    mockedIsTeamAdmin.mockResolvedValue(false);

    mockedFindUserByEmail.mockResolvedValue({
      userId,
      email,
    });

    mockedAddUserToGroup.mockResolvedValue(undefined);

    mockedCreateTeamUser.mockResolvedValue({
      teamId,
      userId,
      username: email,
      isAdmin: true,
      createdDate: now,
      updatedDate: now,
    });

    const event = createAPIGatewayProxyEvent(
      {
        email,
        isAdmin: true,
      },
      teamId,
    );

    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    expect(mockedAddUserToGroup).toHaveBeenCalledWith(userId, 'TeamAdminGroup');
    expect(mockedCreateTeamUser).toHaveBeenCalledWith(teamId, userId, email, true);

    const body = JSON.parse(result.body);
    expect(body.isAdmin).toBe(true);
  });

  test('管理者でない場合は403エラーを返す', async () => {
    const teamId = 'test-team-id';

    mockedIsSystemAdmin.mockReturnValue(false);
    mockedIsTeamAdmin.mockResolvedValue(false);

    const event = createAPIGatewayProxyEvent(
      {
        email: 'newuser@example.com',
        isAdmin: false,
      },
      teamId,
    );

    const result = await handler(event);

    expect(result.statusCode).toBe(403);
    expect(JSON.parse(result.body)).toEqual({
      error: '管理者ではないため利用できません。',
    });
    expect(mockedCreateTeamUser).not.toHaveBeenCalled();
  });

  test('ユーザーが見つからない場合は404エラーを返す', async () => {
    const teamId = 'test-team-id';

    mockedIsSystemAdmin.mockReturnValue(true);
    mockedIsTeamAdmin.mockResolvedValue(false);

    mockedFindUserByEmail.mockResolvedValue(undefined);

    const event = createAPIGatewayProxyEvent(
      {
        email: 'nonexistent@example.com',
        isAdmin: false,
      },
      teamId,
    );

    const result = await handler(event);

    expect(result.statusCode).toBe(404);
    expect(JSON.parse(result.body)).toEqual({
      error: '本環境に未ログインのユーザーです。本環境にログインするようご案内ください。',
    });
    expect(mockedCreateTeamUser).not.toHaveBeenCalled();
  });

  test('予期しないエラーが発生した場合は500エラーを返す', async () => {
    const teamId = 'test-team-id';
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    mockedIsSystemAdmin.mockReturnValue(true);
    mockedIsTeamAdmin.mockResolvedValue(false);
    mockedFindUserByEmail.mockRejectedValue(new Error('Unexpected error'));

    const event = createAPIGatewayProxyEvent(
      {
        email: 'newuser@example.com',
        isAdmin: false,
      },
      teamId,
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
