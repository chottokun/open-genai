import { APIGatewayProxyEvent } from 'aws-lambda';
import { afterAll, beforeEach, describe, expect, type MockedFunction, test, vi } from 'vitest';
import { handler } from '../../lambda/getTeamUser';
import { findTeamById } from '../../lambda/repository/teamRepository';
import { findTeamUserById } from '../../lambda/repository/teamUserRepository';
import * as teamRole from '../../lambda/utils/teamRole';

vi.mock('../../lambda/repository/teamRepository');
vi.mock('../../lambda/repository/teamUserRepository');
vi.mock('../../lambda/utils/teamRole', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lambda/utils/teamRole')>();
  return {
    ...actual,
    isSystemAdmin: vi.fn(),
    isTeamAdmin: vi.fn(),
  };
});

const mockedFindTeamById = findTeamById as MockedFunction<typeof findTeamById>;
const mockedFindTeamUserById = findTeamUserById as MockedFunction<typeof findTeamUserById>;
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
          'cognito:groups': 'UserGroup',
          sub: 'test-user-id',
        },
      },
    },
  } as unknown as APIGatewayProxyEvent;
}

describe('getTeamUser Lambda handler', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  test('チームユーザーを正常に取得できる', async () => {
    const teamId = 'test-team-id';
    const userId = 'target-user-id';
    const now = Date.now().toString();

    mockedFindTeamById.mockResolvedValue({
      teamId,
      teamName: 'テストチーム',
      createdDate: now,
      updatedDate: now,
    });

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

    const event = createAPIGatewayProxyEvent(teamId, userId);

    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    expect(mockedFindTeamById).toHaveBeenCalledWith(teamId);
    expect(mockedFindTeamUserById).toHaveBeenCalledWith(teamId, userId);

    const body = JSON.parse(result.body);
    expect(body.teamId).toBe(teamId);
    expect(body.userId).toBe(userId);
    expect(body.username).toBe('user@example.com');
    expect(body.isAdmin).toBe(false);
  });

  test('管理者ユーザーを正常に取得できる', async () => {
    const teamId = 'test-team-id';
    const userId = 'admin-user-id';
    const now = Date.now().toString();

    mockedFindTeamById.mockResolvedValue({
      teamId,
      teamName: 'テストチーム',
      createdDate: now,
      updatedDate: now,
    });

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

    const event = createAPIGatewayProxyEvent(teamId, userId);

    const result = await handler(event);

    expect(result.statusCode).toBe(200);

    const body = JSON.parse(result.body);
    expect(body.isAdmin).toBe(true);
  });

  test('teamIdがない場合は400エラーを返す', async () => {
    const event = createAPIGatewayProxyEvent(undefined, 'user-id');

    const result = await handler(event);

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body)).toEqual({
      error: 'パラメータが不正です。',
    });
    expect(mockedFindTeamById).not.toHaveBeenCalled();
  });

  test('userIdがない場合は400エラーを返す', async () => {
    const event = createAPIGatewayProxyEvent('team-id', undefined);

    const result = await handler(event);

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body)).toEqual({
      error: 'パラメータが不正です。',
    });
    expect(mockedFindTeamById).not.toHaveBeenCalled();
  });

  test('チームが見つからない場合は400エラーを返す', async () => {
    const teamId = 'nonexistent-team-id';
    const userId = 'user-id';

    mockedFindTeamById.mockResolvedValue(null);
    mockedIsSystemAdmin.mockReturnValue(true);
    mockedIsTeamAdmin.mockResolvedValue(false);

    const event = createAPIGatewayProxyEvent(teamId, userId);

    const result = await handler(event);

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body)).toEqual({
      error: 'チームが見つかりませんでした。',
    });
    expect(mockedFindTeamUserById).not.toHaveBeenCalled();
  });

  test('管理者でない場合は403エラーを返す', async () => {
    const teamId = 'test-team-id';
    const userId = 'user-id';
    const now = Date.now().toString();

    mockedFindTeamById.mockResolvedValue({
      teamId,
      teamName: 'テストチーム',
      createdDate: now,
      updatedDate: now,
    });

    mockedIsSystemAdmin.mockReturnValue(false);
    mockedIsTeamAdmin.mockResolvedValue(false);

    const event = createAPIGatewayProxyEvent(teamId, userId);

    const result = await handler(event);

    expect(result.statusCode).toBe(403);
    expect(JSON.parse(result.body)).toEqual({
      error: '管理者ではないため利用できません。',
    });
    expect(mockedFindTeamUserById).not.toHaveBeenCalled();
  });

  test('ユーザーが見つからない場合は400エラーを返す', async () => {
    const teamId = 'test-team-id';
    const userId = 'nonexistent-user-id';
    const now = Date.now().toString();

    mockedFindTeamById.mockResolvedValue({
      teamId,
      teamName: 'テストチーム',
      createdDate: now,
      updatedDate: now,
    });

    mockedIsSystemAdmin.mockReturnValue(true);
    mockedIsTeamAdmin.mockResolvedValue(false);

    mockedFindTeamUserById.mockResolvedValue(null);

    const event = createAPIGatewayProxyEvent(teamId, userId);

    const result = await handler(event);

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body)).toEqual({
      error: 'ユーザーが見つかりませんでした。',
    });
  });

  test('予期しないエラーが発生した場合は500エラーを返す', async () => {
    const teamId = 'test-team-id';
    const userId = 'user-id';
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    mockedFindTeamById.mockRejectedValue(new Error('Unexpected error'));
    mockedIsSystemAdmin.mockReturnValue(true);
    mockedIsTeamAdmin.mockResolvedValue(false);

    const event = createAPIGatewayProxyEvent(teamId, userId);

    const result = await handler(event);

    expect(result.statusCode).toBe(500);
    expect(JSON.parse(result.body)).toEqual({
      error: 'サーバ側でエラーが発生しました。管理者へご連絡ください。',
    });
    expect(consoleErrorSpy).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });

  describe('アクセス制御マトリクス', () => {
    const teamId = 'test-team-id';
    const userId = 'target-user-id';
    const now = Date.now().toString();

    const mockTeam = {
      teamId,
      teamName: 'テストチーム',
      createdDate: now,
      updatedDate: now,
    };

    const mockUser = {
      teamId,
      userId,
      username: 'user@example.com',
      isAdmin: false,
      createdDate: now,
      updatedDate: now,
    };

    test('SystemAdminはチームユーザーを取得できる', async () => {
      mockedFindTeamById.mockResolvedValue(mockTeam);
      mockedIsSystemAdmin.mockReturnValue(true);
      mockedIsTeamAdmin.mockResolvedValue(false);
      mockedFindTeamUserById.mockResolvedValue(mockUser);

      const event = createAPIGatewayProxyEvent(teamId, userId);
      const result = await handler(event);

      expect(result.statusCode).toBe(200);
    });

    test('TeamAdminはチームユーザーを取得できる', async () => {
      mockedFindTeamById.mockResolvedValue(mockTeam);
      mockedIsSystemAdmin.mockReturnValue(false);
      mockedIsTeamAdmin.mockResolvedValue(true);
      mockedFindTeamUserById.mockResolvedValue(mockUser);

      const event = createAPIGatewayProxyEvent(teamId, userId);
      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      expect(mockedIsTeamAdmin).toHaveBeenCalledWith(event, teamId);
    });

    test('SystemAdminかつTeamAdminの場合もチームユーザーを取得できる', async () => {
      mockedFindTeamById.mockResolvedValue(mockTeam);
      mockedIsSystemAdmin.mockReturnValue(true);
      mockedIsTeamAdmin.mockResolvedValue(true);
      mockedFindTeamUserById.mockResolvedValue(mockUser);

      const event = createAPIGatewayProxyEvent(teamId, userId);
      const result = await handler(event);

      expect(result.statusCode).toBe(200);
    });

    test('非SystemAdminかつ非TeamAdminの場合は403エラーを返す', async () => {
      mockedFindTeamById.mockResolvedValue(mockTeam);
      mockedIsSystemAdmin.mockReturnValue(false);
      mockedIsTeamAdmin.mockResolvedValue(false);

      const event = createAPIGatewayProxyEvent(teamId, userId);
      const result = await handler(event);

      expect(result.statusCode).toBe(403);
      expect(JSON.parse(result.body)).toEqual({
        error: '管理者ではないため利用できません。',
      });
      expect(mockedFindTeamUserById).not.toHaveBeenCalled();
    });
  });
});
