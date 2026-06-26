import { APIGatewayProxyEvent } from 'aws-lambda';
import { afterAll, beforeEach, describe, expect, type MockedFunction, test, vi } from 'vitest';
import { handler } from '../../lambda/listTeamUsers';
import { listTeamUsers } from '../../lambda/repository/teamUserRepository';
import * as teamRole from '../../lambda/utils/teamRole';

vi.mock('../../lambda/repository/teamUserRepository');
vi.mock('../../lambda/utils/teamRole', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lambda/utils/teamRole')>();
  return {
    ...actual,
    isSystemAdmin: vi.fn(),
    isTeamAdmin: vi.fn(),
  };
});

const mockedListTeamUsers = listTeamUsers as MockedFunction<typeof listTeamUsers>;
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
  teamId?: string,
  queryStringParameters?: { exclusiveStartKey?: string; limit?: string },
): APIGatewayProxyEvent {
  return {
    body: null,
    pathParameters: teamId ? { teamId } : {},
    queryStringParameters: queryStringParameters ?? null,
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

describe('listTeamUsers Lambda handler', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  test('システム管理者がチームユーザー一覧を取得できる', async () => {
    const teamId = 'test-team-id';
    const now = Date.now().toString();

    mockedIsSystemAdmin.mockReturnValue(true);
    mockedIsTeamAdmin.mockResolvedValue(false);

    mockedListTeamUsers.mockResolvedValue({
      teamUsers: [
        {
          teamId,
          userId: 'user-1',
          username: 'user1@example.com',
          isAdmin: false,
          createdDate: now,
          updatedDate: now,
        },
        {
          teamId,
          userId: 'user-2',
          username: 'user2@example.com',
          isAdmin: true,
          createdDate: now,
          updatedDate: now,
        },
      ],
      lastEvaluatedKey: undefined,
    });

    const event = createAPIGatewayProxyEvent(teamId);

    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    expect(mockedListTeamUsers).toHaveBeenCalledWith(expect.any(Number), teamId, undefined);

    const body = JSON.parse(result.body);
    expect(body.teamUsers).toHaveLength(2);
    expect(body.teamUsers[0].userId).toBe('user-1');
    expect(body.teamUsers[1].userId).toBe('user-2');
    expect(body.teamUsers[1].isAdmin).toBe(true);
  });

  test('チーム管理者がチームユーザー一覧を取得できる', async () => {
    const teamId = 'test-team-id';
    const now = Date.now().toString();

    mockedIsSystemAdmin.mockReturnValue(false);
    mockedIsTeamAdmin.mockResolvedValue(true);

    mockedListTeamUsers.mockResolvedValue({
      teamUsers: [
        {
          teamId,
          userId: 'user-1',
          username: 'user1@example.com',
          isAdmin: false,
          createdDate: now,
          updatedDate: now,
        },
      ],
      lastEvaluatedKey: undefined,
    });

    const event = createAPIGatewayProxyEvent(teamId);

    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    expect(mockedListTeamUsers).toHaveBeenCalledWith(expect.any(Number), teamId, undefined);
  });

  test('ページネーションを利用できる', async () => {
    const teamId = 'test-team-id';
    const now = Date.now().toString();
    const exclusiveStartKey = 'encoded-key';

    mockedIsSystemAdmin.mockReturnValue(true);
    mockedIsTeamAdmin.mockResolvedValue(false);

    mockedListTeamUsers.mockResolvedValue({
      teamUsers: [
        {
          teamId,
          userId: 'user-3',
          username: 'user3@example.com',
          isAdmin: false,
          createdDate: now,
          updatedDate: now,
        },
      ],
      lastEvaluatedKey: 'next-key',
    });

    const event = createAPIGatewayProxyEvent(teamId, { exclusiveStartKey });

    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    expect(mockedListTeamUsers).toHaveBeenCalledWith(expect.any(Number), teamId, exclusiveStartKey);

    const body = JSON.parse(result.body);
    expect(body.lastEvaluatedKey).toBe('next-key');
  });

  test('teamIdがない場合は400エラーを返す', async () => {
    const event = createAPIGatewayProxyEvent();

    const result = await handler(event);

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body)).toEqual({
      error: 'パラメータが不正です。',
    });
    expect(mockedListTeamUsers).not.toHaveBeenCalled();
  });

  test('管理者でない場合は403エラーを返す', async () => {
    const teamId = 'test-team-id';

    mockedIsSystemAdmin.mockReturnValue(false);
    mockedIsTeamAdmin.mockResolvedValue(false);

    const event = createAPIGatewayProxyEvent(teamId);

    const result = await handler(event);

    expect(result.statusCode).toBe(403);
    expect(JSON.parse(result.body)).toEqual({
      error: '管理者ではないため利用できません。',
    });
    expect(mockedListTeamUsers).not.toHaveBeenCalled();
  });

  test('予期しないエラーが発生した場合は500エラーを返す', async () => {
    const teamId = 'test-team-id';
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    mockedIsSystemAdmin.mockReturnValue(true);
    mockedIsTeamAdmin.mockResolvedValue(false);
    mockedListTeamUsers.mockRejectedValue(new Error('Unexpected error'));

    const event = createAPIGatewayProxyEvent(teamId);

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
    const now = Date.now().toString();

    const mockTeamUsers = {
      teamUsers: [
        {
          teamId,
          userId: 'user-1',
          username: 'user1@example.com',
          isAdmin: false,
          createdDate: now,
          updatedDate: now,
        },
      ],
      lastEvaluatedKey: undefined,
    };

    test('SystemAdminはチームユーザー一覧を取得できる', async () => {
      mockedIsSystemAdmin.mockReturnValue(true);
      mockedIsTeamAdmin.mockResolvedValue(false);
      mockedListTeamUsers.mockResolvedValue(mockTeamUsers);

      const event = createAPIGatewayProxyEvent(teamId);
      const result = await handler(event);

      expect(result.statusCode).toBe(200);
    });

    test('TeamAdminはチームユーザー一覧を取得できる', async () => {
      mockedIsSystemAdmin.mockReturnValue(false);
      mockedIsTeamAdmin.mockResolvedValue(true);
      mockedListTeamUsers.mockResolvedValue(mockTeamUsers);

      const event = createAPIGatewayProxyEvent(teamId);
      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      expect(mockedIsTeamAdmin).toHaveBeenCalledWith(event, teamId);
    });

    test('SystemAdminかつTeamAdminの場合もチームユーザー一覧を取得できる', async () => {
      mockedIsSystemAdmin.mockReturnValue(true);
      mockedIsTeamAdmin.mockResolvedValue(true);
      mockedListTeamUsers.mockResolvedValue(mockTeamUsers);

      const event = createAPIGatewayProxyEvent(teamId);
      const result = await handler(event);

      expect(result.statusCode).toBe(200);
    });

    test('非SystemAdminかつ非TeamAdminの場合は403エラーを返す', async () => {
      mockedIsSystemAdmin.mockReturnValue(false);
      mockedIsTeamAdmin.mockResolvedValue(false);

      const event = createAPIGatewayProxyEvent(teamId);
      const result = await handler(event);

      expect(result.statusCode).toBe(403);
      expect(JSON.parse(result.body)).toEqual({
        error: '管理者ではないため利用できません。',
      });
      expect(mockedListTeamUsers).not.toHaveBeenCalled();
    });
  });
});
