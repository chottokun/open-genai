import { APIGatewayProxyEvent } from 'aws-lambda';
import { afterAll, beforeEach, describe, expect, type MockedFunction, test, vi } from 'vitest';
import { handler } from '../../lambda/listTeams';
import {
  findTeamById,
  listTeamIdByAdminId,
  listTeams,
} from '../../lambda/repository/teamRepository';
import * as teamRole from '../../lambda/utils/teamRole';

vi.mock('../../lambda/repository/teamRepository');
vi.mock('../../lambda/utils/teamRole', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lambda/utils/teamRole')>();
  return {
    ...actual,
    isSystemAdmin: vi.fn(),
  };
});

const mockedListTeams = listTeams as MockedFunction<typeof listTeams>;
const mockedListTeamIdByAdminId = listTeamIdByAdminId as MockedFunction<typeof listTeamIdByAdminId>;
const mockedFindTeamById = findTeamById as MockedFunction<typeof findTeamById>;
const mockedIsSystemAdmin = teamRole.isSystemAdmin as MockedFunction<
  typeof teamRole.isSystemAdmin
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
  userId: string = 'test-user-id',
  queryStringParameters?: { exclusiveStartKey?: string; name?: string; limit?: string },
): APIGatewayProxyEvent {
  return {
    body: null,
    pathParameters: {},
    queryStringParameters: queryStringParameters ?? null,
    requestContext: {
      authorizer: {
        claims: {
          'cognito:groups': 'SystemAdminGroup',
          sub: userId,
        },
      },
    },
  } as unknown as APIGatewayProxyEvent;
}

describe('listTeams Lambda handler', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  test('システム管理者が全チーム一覧を取得できる', async () => {
    const now = Date.now().toString();

    mockedIsSystemAdmin.mockReturnValue(true);

    mockedListTeams.mockResolvedValue({
      teams: [
        {
          teamId: 'team-1',
          teamName: 'チーム1',
          createdDate: now,
          updatedDate: now,
        },
        {
          teamId: 'team-2',
          teamName: 'チーム2',
          createdDate: now,
          updatedDate: now,
        },
      ],
      lastEvaluatedKey: undefined,
    });

    const event = createAPIGatewayProxyEvent();

    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    expect(mockedListTeams).toHaveBeenCalled();
    expect(mockedListTeamIdByAdminId).not.toHaveBeenCalled();

    const body = JSON.parse(result.body);
    expect(body.teams).toHaveLength(2);
    expect(body.teams[0].teamId).toBe('team-1');
    expect(body.teams[1].teamId).toBe('team-2');
  });

  test('システム管理者がチーム名でフィルタリングできる', async () => {
    const now = Date.now().toString();

    mockedIsSystemAdmin.mockReturnValue(true);

    mockedListTeams.mockResolvedValue({
      teams: [
        {
          teamId: 'team-1',
          teamName: '開発チーム',
          createdDate: now,
          updatedDate: now,
        },
      ],
      lastEvaluatedKey: undefined,
    });

    const event = createAPIGatewayProxyEvent('test-user-id', { name: '開発' });

    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    expect(mockedListTeams).toHaveBeenCalledWith(expect.any(Number), undefined, '開発');

    const body = JSON.parse(result.body);
    expect(body.teams).toHaveLength(1);
    expect(body.teams[0].teamName).toBe('開発チーム');
  });

  test('システム管理者がページネーションを利用できる', async () => {
    const now = Date.now().toString();
    const exclusiveStartKey = 'encoded-key';

    mockedIsSystemAdmin.mockReturnValue(true);

    mockedListTeams.mockResolvedValue({
      teams: [
        {
          teamId: 'team-3',
          teamName: 'チーム3',
          createdDate: now,
          updatedDate: now,
        },
      ],
      lastEvaluatedKey: 'next-key',
    });

    const event = createAPIGatewayProxyEvent('test-user-id', { exclusiveStartKey });

    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    expect(mockedListTeams).toHaveBeenCalledWith(expect.any(Number), exclusiveStartKey, undefined);

    const body = JSON.parse(result.body);
    expect(body.lastEvaluatedKey).toBe('next-key');
  });

  test('チーム管理者が自分が管理するチーム一覧を取得できる', async () => {
    const userId = 'team-admin-id';
    const now = Date.now().toString();

    mockedIsSystemAdmin.mockReturnValue(false);

    mockedListTeamIdByAdminId.mockResolvedValue({
      teamIds: ['team-1', 'team-2'],
      lastEvaluatedKey: undefined,
    });

    mockedFindTeamById
      .mockResolvedValueOnce({
        teamId: 'team-1',
        teamName: 'チーム1',
        createdDate: now,
        updatedDate: now,
      })
      .mockResolvedValueOnce({
        teamId: 'team-2',
        teamName: 'チーム2',
        createdDate: now,
        updatedDate: now,
      });

    const event = createAPIGatewayProxyEvent(userId);

    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    expect(mockedListTeamIdByAdminId).toHaveBeenCalledWith(
      expect.any(Number),
      userId,
      undefined,
      undefined,
    );
    expect(mockedFindTeamById).toHaveBeenCalledTimes(2);

    const body = JSON.parse(result.body);
    expect(body.teams).toHaveLength(2);
  });

  test('チーム管理者で管理チームがない場合は403エラーを返す', async () => {
    const userId = 'non-admin-user-id';

    mockedIsSystemAdmin.mockReturnValue(false);

    mockedListTeamIdByAdminId.mockResolvedValue({
      teamIds: [],
      lastEvaluatedKey: undefined,
    });

    const event = createAPIGatewayProxyEvent(userId);

    const result = await handler(event);

    expect(result.statusCode).toBe(403);
    expect(JSON.parse(result.body)).toEqual({
      error: '管理者ではないため利用できません。',
    });
  });

  test('予期しないエラーが発生した場合は500エラーを返す', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    mockedIsSystemAdmin.mockReturnValue(true);
    mockedListTeams.mockRejectedValue(new Error('Unexpected error'));

    const event = createAPIGatewayProxyEvent();

    const result = await handler(event);

    expect(result.statusCode).toBe(500);
    expect(JSON.parse(result.body)).toEqual({
      error: 'サーバ側でエラーが発生しました。管理者へご連絡ください。',
    });
    expect(consoleErrorSpy).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });
});
