import { APIGatewayProxyEvent } from 'aws-lambda';
import { afterAll, beforeEach, describe, expect, type MockedFunction, test, vi } from 'vitest';
import { handler } from '../../lambda/getRawTeam';
import { findRawTeamById } from '../../lambda/repository/teamRepository';
import * as teamRole from '../../lambda/utils/teamRole';

vi.mock('../../lambda/repository/teamRepository');
vi.mock('../../lambda/utils/teamRole', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lambda/utils/teamRole')>();
  return {
    ...actual,
    isSystemAdmin: vi.fn(),
    isTeamAdmin: vi.fn(),
  };
});

const mockedFindRawTeamById = findRawTeamById as MockedFunction<typeof findRawTeamById>;
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

function createAPIGatewayProxyEvent(teamId?: string): APIGatewayProxyEvent {
  return {
    body: null,
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

describe('getRawTeam Lambda handler', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  test('システム管理者がチームをRaw形式で正常に取得できる', async () => {
    const teamId = 'test-team-id';
    const now = Date.now().toString();

    mockedIsSystemAdmin.mockReturnValue(true);
    mockedIsTeamAdmin.mockResolvedValue(false);

    mockedFindRawTeamById.mockResolvedValue({
      pk: { S: `team#${teamId}` },
      sk: { S: 'team' },
      teamName: { S: 'テストチーム' },
      createdDate: { S: now },
      updatedDate: { S: now },
    });

    const event = createAPIGatewayProxyEvent(teamId);

    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    expect(mockedFindRawTeamById).toHaveBeenCalledWith(teamId);

    const body = JSON.parse(result.body);
    expect(body.pk.S).toBe(`team#${teamId}`);
    expect(body.teamName.S).toBe('テストチーム');
  });

  test('チーム管理者がチームをRaw形式で正常に取得できる', async () => {
    const teamId = 'test-team-id';
    const now = Date.now().toString();

    mockedIsSystemAdmin.mockReturnValue(false);
    mockedIsTeamAdmin.mockResolvedValue(true);

    mockedFindRawTeamById.mockResolvedValue({
      pk: { S: `team#${teamId}` },
      sk: { S: 'team' },
      teamName: { S: 'テストチーム' },
      createdDate: { S: now },
      updatedDate: { S: now },
    });

    const event = createAPIGatewayProxyEvent(teamId);

    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    expect(mockedFindRawTeamById).toHaveBeenCalledWith(teamId);
  });

  test('管理者でない場合は403エラーを返す', async () => {
    const teamId = 'test-team-id';
    const now = Date.now().toString();

    mockedIsSystemAdmin.mockReturnValue(false);
    mockedIsTeamAdmin.mockResolvedValue(false);

    mockedFindRawTeamById.mockResolvedValue({
      pk: { S: `team#${teamId}` },
      sk: { S: 'team' },
      teamName: { S: 'テストチーム' },
      createdDate: { S: now },
      updatedDate: { S: now },
    });

    const event = createAPIGatewayProxyEvent(teamId);

    const result = await handler(event);

    expect(result.statusCode).toBe(403);
    expect(JSON.parse(result.body)).toEqual({
      error: '管理者ではないため利用できません。',
    });
  });

  test('teamIdがない場合は400エラーを返す', async () => {
    const event = createAPIGatewayProxyEvent();

    const result = await handler(event);

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body)).toEqual({
      error: 'パラメータが不正です。',
    });
    expect(mockedFindRawTeamById).not.toHaveBeenCalled();
  });

  test('チームが見つからない場合は400エラーを返す', async () => {
    const teamId = 'nonexistent-team-id';

    mockedIsSystemAdmin.mockReturnValue(true);
    mockedIsTeamAdmin.mockResolvedValue(false);
    mockedFindRawTeamById.mockResolvedValue(null);

    const event = createAPIGatewayProxyEvent(teamId);

    const result = await handler(event);

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body)).toEqual({
      error: 'チームが見つかりませんでした。',
    });
  });

  test('予期しないエラーが発生した場合は500エラーを返す', async () => {
    const teamId = 'test-team-id';

    mockedIsSystemAdmin.mockReturnValue(true);
    mockedIsTeamAdmin.mockResolvedValue(false);
    mockedFindRawTeamById.mockRejectedValue(new Error('Unexpected error'));

    const event = createAPIGatewayProxyEvent(teamId);

    const result = await handler(event);

    expect(result.statusCode).toBe(500);
    expect(JSON.parse(result.body)).toEqual({
      error: 'サーバ側でエラーが発生しました。管理者へご連絡ください。',
    });
  });
});
