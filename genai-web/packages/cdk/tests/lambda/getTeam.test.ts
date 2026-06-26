import { APIGatewayProxyEvent } from 'aws-lambda';
import { afterAll, beforeEach, describe, expect, type MockedFunction, test, vi } from 'vitest';
import { handler } from '../../lambda/getTeam';
import { findTeamById } from '../../lambda/repository/teamRepository';
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

const mockedFindTeamById = findTeamById as MockedFunction<typeof findTeamById>;
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
          'cognito:groups': 'UserGroup',
          sub: 'test-user-id',
        },
      },
    },
  } as unknown as APIGatewayProxyEvent;
}

describe('getTeam Lambda handler', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  test('システム管理者がチームを正常に取得できる', async () => {
    const teamId = 'test-team-id';
    const now = Date.now().toString();

    mockedIsSystemAdmin.mockReturnValue(true);
    mockedIsTeamAdmin.mockResolvedValue(false);

    mockedFindTeamById.mockResolvedValue({
      teamId,
      teamName: 'テストチーム',
      createdDate: now,
      updatedDate: now,
    });

    const event = createAPIGatewayProxyEvent(teamId);

    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    expect(mockedFindTeamById).toHaveBeenCalledWith(teamId);

    const body = JSON.parse(result.body);
    expect(body.teamId).toBe(teamId);
    expect(body.teamName).toBe('テストチーム');
    expect(body.createdDate).toBe(now);
    expect(body.updatedDate).toBe(now);
  });

  test('チーム管理者がチームを正常に取得できる', async () => {
    const teamId = 'test-team-id';
    const now = Date.now().toString();

    mockedIsSystemAdmin.mockReturnValue(false);
    mockedIsTeamAdmin.mockResolvedValue(true);

    mockedFindTeamById.mockResolvedValue({
      teamId,
      teamName: 'テストチーム',
      createdDate: now,
      updatedDate: now,
    });

    const event = createAPIGatewayProxyEvent(teamId);

    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    expect(mockedFindTeamById).toHaveBeenCalledWith(teamId);

    const body = JSON.parse(result.body);
    expect(body.teamId).toBe(teamId);
    expect(body.teamName).toBe('テストチーム');
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
    expect(mockedFindTeamById).not.toHaveBeenCalled();
  });

  test('共通チームは管理者でなくても取得できる', async () => {
    const teamId = '00000000-0000-0000-0000-000000000000';
    const now = Date.now().toString();

    mockedIsSystemAdmin.mockReturnValue(false);
    mockedIsTeamAdmin.mockResolvedValue(false);

    mockedFindTeamById.mockResolvedValue({
      teamId,
      teamName: '共通アプリ',
      createdDate: now,
      updatedDate: now,
    });

    const event = createAPIGatewayProxyEvent(teamId);

    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    expect(mockedIsSystemAdmin).not.toHaveBeenCalled();
    expect(mockedIsTeamAdmin).not.toHaveBeenCalled();
    expect(mockedFindTeamById).toHaveBeenCalledWith(teamId);

    const body = JSON.parse(result.body);
    expect(body.teamId).toBe(teamId);
    expect(body.teamName).toBe('共通アプリ');
  });

  test('teamIdがない場合は400エラーを返す', async () => {
    const event = createAPIGatewayProxyEvent();

    const result = await handler(event);

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body)).toEqual({
      error: 'パラメータが不正です。',
    });
    expect(mockedFindTeamById).not.toHaveBeenCalled();
  });

  test('チームが見つからない場合は400エラーを返す', async () => {
    const teamId = 'nonexistent-team-id';

    mockedIsSystemAdmin.mockReturnValue(true);
    mockedIsTeamAdmin.mockResolvedValue(false);
    mockedFindTeamById.mockResolvedValue(null);

    const event = createAPIGatewayProxyEvent(teamId);

    const result = await handler(event);

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body)).toEqual({
      error: 'チームが見つかりませんでした。',
    });
  });

  test('予期しないエラーが発生した場合は500エラーを返す', async () => {
    const teamId = 'test-team-id';
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    mockedIsSystemAdmin.mockReturnValue(true);
    mockedIsTeamAdmin.mockResolvedValue(false);
    mockedFindTeamById.mockRejectedValue(new Error('Unexpected error'));

    const event = createAPIGatewayProxyEvent(teamId);

    const result = await handler(event);

    expect(result.statusCode).toBe(500);
    expect(JSON.parse(result.body)).toEqual({
      error: 'サーバ側でエラーが発生しました。管理者へご連絡ください。',
    });
    expect(consoleErrorSpy).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });
});
