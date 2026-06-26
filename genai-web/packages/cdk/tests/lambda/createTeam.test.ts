import { APIGatewayProxyEvent } from 'aws-lambda';
import { afterAll, beforeEach, describe, expect, type MockedFunction, test, vi } from 'vitest';
import { handler } from '../../lambda/createTeam';
import { createTeam } from '../../lambda/repository/teamRepository';
import { createTeamUser } from '../../lambda/repository/teamUserRepository';
import { addUserToGroup, findUserByEmail } from '../../lambda/utils/cognitoApi';

vi.mock('../../lambda/repository/teamRepository');
vi.mock('../../lambda/repository/teamUserRepository');
vi.mock('../../lambda/utils/cognitoApi');

const mockedCreateTeam = createTeam as MockedFunction<typeof createTeam>;
const mockedCreateTeamUser = createTeamUser as MockedFunction<typeof createTeamUser>;
const mockedFindUserByEmail = findUserByEmail as MockedFunction<typeof findUserByEmail>;
const mockedAddUserToGroup = addUserToGroup as MockedFunction<typeof addUserToGroup>;

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
  isSystemAdmin: boolean = true,
): APIGatewayProxyEvent {
  return {
    body: body ? JSON.stringify(body) : null,
    pathParameters: {},
    requestContext: {
      authorizer: {
        claims: {
          'cognito:groups': isSystemAdmin ? 'SystemAdminGroup' : 'UserGroup',
          sub: 'test-user-id',
        },
      },
    },
  } as unknown as APIGatewayProxyEvent;
}

describe('createTeam Lambda handler', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  test('システム管理者がチームを正常に作成できる', async () => {
    const teamId = 'test-team-id';
    const now = Date.now().toString();
    const teamAdminUserId = 'admin-user-id';

    mockedCreateTeam.mockResolvedValue({
      teamId,
      teamName: 'テストチーム',
      createdDate: now,
      updatedDate: now,
    });

    mockedFindUserByEmail.mockResolvedValue({
      userId: teamAdminUserId,
      email: 'admin@example.com',
    });

    mockedAddUserToGroup.mockResolvedValue(undefined);

    mockedCreateTeamUser.mockResolvedValue({
      teamId,
      userId: teamAdminUserId,
      username: 'admin@example.com',
      isAdmin: true,
      createdDate: now,
      updatedDate: now,
    });

    const event = createAPIGatewayProxyEvent({
      teamName: 'テストチーム',
      teamAdminEmail: 'admin@example.com',
    });

    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    expect(mockedCreateTeam).toHaveBeenCalledWith('テストチーム');
    expect(mockedFindUserByEmail).toHaveBeenCalledWith('admin@example.com');
    expect(mockedAddUserToGroup).toHaveBeenCalledWith(teamAdminUserId, 'TeamAdminGroup');
    expect(mockedCreateTeamUser).toHaveBeenCalledWith(
      teamId,
      teamAdminUserId,
      'admin@example.com',
      true,
    );

    const body = JSON.parse(result.body);
    expect(body.teamId).toBe(teamId);
    expect(body.teamName).toBe('テストチーム');
    expect(body.teamUser).toBeDefined();
  });

  test('システム管理者でない場合は403エラーを返す', async () => {
    const event = createAPIGatewayProxyEvent(
      {
        teamName: 'テストチーム',
        teamAdminEmail: 'admin@example.com',
      },
      false,
    );

    const result = await handler(event);

    expect(result.statusCode).toBe(403);
    expect(JSON.parse(result.body)).toEqual({
      error: '管理者ではないため利用できません。',
    });
    expect(mockedCreateTeam).not.toHaveBeenCalled();
  });

  test('チーム名が空の場合は400エラーを返す', async () => {
    const event = createAPIGatewayProxyEvent({
      teamName: '',
      teamAdminEmail: 'admin@example.com',
    });

    const result = await handler(event);

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body)).toEqual({
      error: 'チーム名は必須です。',
    });
    expect(mockedCreateTeam).not.toHaveBeenCalled();
  });

  test('チーム名が空白のみの場合は400エラーを返す', async () => {
    const event = createAPIGatewayProxyEvent({
      teamName: '   ',
      teamAdminEmail: 'admin@example.com',
    });

    const result = await handler(event);

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body)).toEqual({
      error: 'チーム名は必須です。',
    });
    expect(mockedCreateTeam).not.toHaveBeenCalled();
  });

  test('チーム名が文字列でない場合は400エラーを返す', async () => {
    const event = createAPIGatewayProxyEvent({
      teamName: 123,
      teamAdminEmail: 'admin@example.com',
    });

    const result = await handler(event);

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body)).toEqual({
      error: 'チーム名の形式が不正です。',
    });
    expect(mockedCreateTeam).not.toHaveBeenCalled();
  });

  test('チーム管理者のメールアドレスが空の場合は400エラーを返す', async () => {
    const event = createAPIGatewayProxyEvent({
      teamName: 'テストチーム',
      teamAdminEmail: '',
    });

    const result = await handler(event);

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body)).toEqual({
      error: 'チーム管理者のメールアドレスは必須です。',
    });
    expect(mockedCreateTeam).not.toHaveBeenCalled();
  });

  test('チーム管理者のメールアドレスが文字列でない場合は400エラーを返す', async () => {
    const event = createAPIGatewayProxyEvent({
      teamName: 'テストチーム',
      teamAdminEmail: 123,
    });

    const result = await handler(event);

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body)).toEqual({
      error: 'チーム管理者のメールアドレスの形式が不正です。',
    });
    expect(mockedCreateTeam).not.toHaveBeenCalled();
  });

  test('チーム管理者のユーザーが見つからない場合は404エラーを返す', async () => {
    const now = Date.now().toString();

    mockedCreateTeam.mockResolvedValue({
      teamId: 'test-team-id',
      teamName: 'テストチーム',
      createdDate: now,
      updatedDate: now,
    });

    mockedFindUserByEmail.mockResolvedValue(undefined);

    const event = createAPIGatewayProxyEvent({
      teamName: 'テストチーム',
      teamAdminEmail: 'nonexistent@example.com',
    });

    const result = await handler(event);

    expect(result.statusCode).toBe(404);
    expect(JSON.parse(result.body)).toEqual({
      error: '本環境に未ログインのユーザーです。本環境へのログインをご案内ください。',
    });
    expect(mockedCreateTeam).not.toHaveBeenCalled();
  });

  test('予期しないエラーが発生した場合は500エラーを返す', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    mockedFindUserByEmail.mockResolvedValue({
      userId: 'admin-user-id',
      email: 'admin@example.com',
    });
    mockedCreateTeam.mockRejectedValue(new Error('Unexpected error'));

    const event = createAPIGatewayProxyEvent({
      teamName: 'テストチーム',
      teamAdminEmail: 'admin@example.com',
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
