import { APIGatewayProxyEvent } from 'aws-lambda';
import { afterAll, beforeEach, describe, expect, type MockedFunction, test, vi } from 'vitest';
import { handler } from '../../lambda/updateTeam';
import { updateTeam } from '../../lambda/repository/teamRepository';
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

const mockedUpdateTeam = updateTeam as MockedFunction<typeof updateTeam>;
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
    pathParameters: teamId ? { teamId } : {},
    requestContext: {
      authorizer: {
        claims: {
          'cognito:groups': 'SystemAdminGroup',
          sub: userId ?? 'test-user-id',
        },
      },
    },
  } as unknown as APIGatewayProxyEvent;
}

describe('updateTeam Lambda handler', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  test('システム管理者がチームを正常に更新できる', async () => {
    const teamId = 'test-team-id';
    const now = Date.now().toString();

    mockedIsSystemAdmin.mockReturnValue(true);
    mockedIsTeamAdmin.mockResolvedValue(false);

    mockedUpdateTeam.mockResolvedValue({
      teamId,
      teamName: '更新後のチーム名',
      createdDate: now,
      updatedDate: now,
    });

    const event = createAPIGatewayProxyEvent(
      {
        teamName: '更新後のチーム名',
      },
      teamId,
    );

    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    expect(mockedUpdateTeam).toHaveBeenCalledWith(teamId, '更新後のチーム名');

    const body = JSON.parse(result.body);
    expect(body.teamId).toBe(teamId);
    expect(body.teamName).toBe('更新後のチーム名');
  });

  test('チーム管理者がチームを正常に更新できる', async () => {
    const teamId = 'test-team-id';
    const now = Date.now().toString();

    mockedIsSystemAdmin.mockReturnValue(false);
    mockedIsTeamAdmin.mockResolvedValue(true);

    mockedUpdateTeam.mockResolvedValue({
      teamId,
      teamName: '更新後のチーム名',
      createdDate: now,
      updatedDate: now,
    });

    const event = createAPIGatewayProxyEvent(
      {
        teamName: '更新後のチーム名',
      },
      teamId,
    );

    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    expect(mockedUpdateTeam).toHaveBeenCalledWith(teamId, '更新後のチーム名');
  });

  test('管理者でない場合は403エラーを返す', async () => {
    const teamId = 'test-team-id';

    mockedIsSystemAdmin.mockReturnValue(false);
    mockedIsTeamAdmin.mockResolvedValue(false);

    const event = createAPIGatewayProxyEvent(
      {
        teamName: '更新後のチーム名',
      },
      teamId,
    );

    const result = await handler(event);

    expect(result.statusCode).toBe(403);
    expect(JSON.parse(result.body)).toEqual({
      error: '管理者ではないため利用できません。',
    });
    expect(mockedUpdateTeam).not.toHaveBeenCalled();
  });

  test('teamIdがない場合は400エラーを返す', async () => {
    mockedIsSystemAdmin.mockReturnValue(true);

    const event = createAPIGatewayProxyEvent({
      teamName: '更新後のチーム名',
    });

    const result = await handler(event);

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body)).toEqual({
      error: 'パラメータが不正です。',
    });
    expect(mockedUpdateTeam).not.toHaveBeenCalled();
  });

  test('チーム名が空の場合は400エラーを返す', async () => {
    const teamId = 'test-team-id';

    mockedIsSystemAdmin.mockReturnValue(true);
    mockedIsTeamAdmin.mockResolvedValue(false);

    const event = createAPIGatewayProxyEvent(
      {
        teamName: '',
      },
      teamId,
    );

    const result = await handler(event);

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body)).toEqual({
      error: 'チーム名は必須です。',
    });
    expect(mockedUpdateTeam).not.toHaveBeenCalled();
  });

  test('チーム名が空白のみの場合は400エラーを返す', async () => {
    const teamId = 'test-team-id';

    mockedIsSystemAdmin.mockReturnValue(true);
    mockedIsTeamAdmin.mockResolvedValue(false);

    const event = createAPIGatewayProxyEvent(
      {
        teamName: '   ',
      },
      teamId,
    );

    const result = await handler(event);

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body)).toEqual({
      error: 'チーム名は必須です。',
    });
    expect(mockedUpdateTeam).not.toHaveBeenCalled();
  });

  test('チーム名が文字列でない場合は400エラーを返す', async () => {
    const teamId = 'test-team-id';

    mockedIsSystemAdmin.mockReturnValue(true);
    mockedIsTeamAdmin.mockResolvedValue(false);

    const event = createAPIGatewayProxyEvent(
      {
        teamName: 123,
      },
      teamId,
    );

    const result = await handler(event);

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body)).toEqual({
      error: 'チーム名の形式が不正です。',
    });
    expect(mockedUpdateTeam).not.toHaveBeenCalled();
  });

  test('予期しないエラーが発生した場合は500エラーを返す', async () => {
    const teamId = 'test-team-id';
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    mockedIsSystemAdmin.mockReturnValue(true);
    mockedIsTeamAdmin.mockResolvedValue(false);
    mockedUpdateTeam.mockRejectedValue(new Error('Unexpected error'));

    const event = createAPIGatewayProxyEvent(
      {
        teamName: '更新後のチーム名',
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
