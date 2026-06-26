import { APIGatewayProxyEvent } from 'aws-lambda';
import { afterAll, beforeEach, describe, expect, type MockedFunction, test, vi } from 'vitest';
import { handler } from '../../lambda/getExApp';
import { findExAppById } from '../../lambda/repository/exAppRepository';
import { findTeamById } from '../../lambda/repository/teamRepository';
import * as teamRole from '../../lambda/utils/teamRole';

vi.mock('../../lambda/repository/exAppRepository');
vi.mock('../../lambda/repository/teamRepository');
vi.mock('../../lambda/utils/teamRole', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lambda/utils/teamRole')>();
  return {
    ...actual,
    isSystemAdmin: vi.fn(),
    isTeamUser: vi.fn(),
  };
});

const mockedFindExAppById = findExAppById as MockedFunction<typeof findExAppById>;
const mockedFindTeamById = findTeamById as MockedFunction<typeof findTeamById>;
const mockedIsSystemAdmin = teamRole.isSystemAdmin as MockedFunction<
  typeof teamRole.isSystemAdmin
>;
const mockedIsTeamUser = teamRole.isTeamUser as MockedFunction<
  typeof teamRole.isTeamUser
>;

const originalEnv = process.env;
beforeEach(() => {
  vi.resetModules();
  process.env = { ...originalEnv };
});

afterAll(() => {
  process.env = originalEnv;
});

function createAPIGatewayProxyEvent(teamId?: string, exAppId?: string): APIGatewayProxyEvent {
  return {
    body: null,
    pathParameters: { teamId, exAppId },
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

describe('getExApp Lambda handler', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  test('チームメンバーがExAppを正常に取得できる', async () => {
    const teamId = 'test-team-id';
    const exAppId = 'target-exapp-id';
    const now = Date.now().toString();

    mockedFindTeamById.mockResolvedValue({
      teamId,
      teamName: 'テストチーム',
      createdDate: now,
      updatedDate: now,
    });

    mockedIsSystemAdmin.mockReturnValue(false);
    mockedIsTeamUser.mockResolvedValue(true);

    mockedFindExAppById.mockResolvedValue({
      teamId,
      exAppId,
      exAppName: 'テストアプリ',
      description: 'テストアプリの概要',
      howToUse: 'テストアプリの使い方',
      endpoint: 'https://api.example.com/test',
      apiKey: '',
      placeholder: '{"input": "test"}',
      config: '{"model": "test"}',
      systemPrompt: 'テストプロンプト',
      systemPromptKeyName: 'system',
      copyable: true,
      status: 'published',
      createdDate: now,
      updatedDate: now,
    });

    const event = createAPIGatewayProxyEvent(teamId, exAppId);

    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    expect(mockedFindTeamById).toHaveBeenCalledWith(teamId);
    expect(mockedFindExAppById).toHaveBeenCalledWith(teamId, exAppId);

    const body = JSON.parse(result.body);
    expect(body.exAppId).toBe(exAppId);
    expect(body.exAppName).toBe('テストアプリ');
  });

  test('共通チームのExAppはチームメンバーでなくても取得できる', async () => {
    const teamId = '00000000-0000-0000-0000-000000000000';
    const exAppId = 'common-exapp-id';
    const now = Date.now().toString();

    mockedFindTeamById.mockResolvedValue({
      teamId,
      teamName: '共通チーム',
      createdDate: now,
      updatedDate: now,
    });

    mockedIsSystemAdmin.mockReturnValue(false);
    mockedIsTeamUser.mockResolvedValue(false);

    mockedFindExAppById.mockResolvedValue({
      teamId,
      exAppId,
      exAppName: '共通アプリ',
      description: '共通アプリの概要',
      howToUse: '共通アプリの使い方',
      endpoint: 'https://api.example.com/common',
      apiKey: '',
      placeholder: '{"input": "test"}',
      config: '{"model": "test"}',
      systemPrompt: '共通プロンプト',
      systemPromptKeyName: 'system',
      copyable: true,
      status: 'published',
      createdDate: now,
      updatedDate: now,
    });

    const event = createAPIGatewayProxyEvent(teamId, exAppId);

    const result = await handler(event);

    expect(result.statusCode).toBe(200);
  });

  test('teamIdがない場合は400エラーを返す', async () => {
    const event = createAPIGatewayProxyEvent(undefined, 'exapp-id');

    const result = await handler(event);

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body)).toEqual({
      error: 'パラメータが不正です。',
    });
  });

  test('exAppIdがない場合は400エラーを返す', async () => {
    const event = createAPIGatewayProxyEvent('team-id', undefined);

    const result = await handler(event);

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body)).toEqual({
      error: 'パラメータが不正です。',
    });
  });

  test('チームが見つからない場合は400エラーを返す', async () => {
    const teamId = 'nonexistent-team-id';
    const exAppId = 'exapp-id';

    mockedFindTeamById.mockResolvedValue(null);

    const event = createAPIGatewayProxyEvent(teamId, exAppId);

    const result = await handler(event);

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body)).toEqual({
      error: 'チームが見つかりませんでした。',
    });
  });

  test('チームメンバーでない場合は403エラーを返す', async () => {
    const teamId = 'test-team-id';
    const exAppId = 'exapp-id';
    const now = Date.now().toString();

    mockedFindTeamById.mockResolvedValue({
      teamId,
      teamName: 'テストチーム',
      createdDate: now,
      updatedDate: now,
    });

    mockedIsSystemAdmin.mockReturnValue(false);
    mockedIsTeamUser.mockResolvedValue(false);

    const event = createAPIGatewayProxyEvent(teamId, exAppId);

    const result = await handler(event);

    expect(result.statusCode).toBe(403);
    expect(JSON.parse(result.body)).toEqual({
      error: 'チームメンバーではないため利用できません。',
    });
  });

  test('ExAppが見つからない場合は400エラーを返す', async () => {
    const teamId = 'test-team-id';
    const exAppId = 'nonexistent-exapp-id';
    const now = Date.now().toString();

    mockedFindTeamById.mockResolvedValue({
      teamId,
      teamName: 'テストチーム',
      createdDate: now,
      updatedDate: now,
    });

    mockedIsSystemAdmin.mockReturnValue(false);
    mockedIsTeamUser.mockResolvedValue(true);

    mockedFindExAppById.mockResolvedValue(null);

    const event = createAPIGatewayProxyEvent(teamId, exAppId);

    const result = await handler(event);

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body)).toEqual({
      error: 'AIアプリが見つかりませんでした。',
    });
  });

  test('予期しないエラーが発生した場合は500エラーを返す', async () => {
    const teamId = 'test-team-id';
    const exAppId = 'exapp-id';
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    mockedFindTeamById.mockRejectedValue(new Error('Unexpected error'));

    const event = createAPIGatewayProxyEvent(teamId, exAppId);

    const result = await handler(event);

    expect(result.statusCode).toBe(500);
    expect(JSON.parse(result.body)).toEqual({
      error: 'サーバ側でエラーが発生しました。管理者へご連絡ください。',
    });
    expect(consoleErrorSpy).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });

  describe('アクセス制御マトリクス', () => {
    const regularTeamId = 'regular-team-id';
    const commonTeamId = '00000000-0000-0000-0000-000000000000';
    const exAppId = 'test-exapp-id';
    const now = Date.now().toString();

    const mockExApp = {
      teamId: regularTeamId,
      exAppId,
      exAppName: 'テストアプリ',
      description: 'テストアプリの概要',
      howToUse: 'テストアプリの使い方',
      endpoint: 'https://api.example.com/test',
      apiKey: '',
      placeholder: '{"input": "test"}',
      config: '{"model": "test"}',
      systemPrompt: 'テストプロンプト',
      systemPromptKeyName: 'system',
      copyable: true,
      status: 'published' as const,
      createdDate: now,
      updatedDate: now,
    };

    test('SystemAdminはチームメンバーでなくてもExAppを取得できる', async () => {
      mockedFindTeamById.mockResolvedValue({
        teamId: regularTeamId,
        teamName: 'テストチーム',
        createdDate: now,
        updatedDate: now,
      });

      mockedIsSystemAdmin.mockReturnValue(true);
      // isTeamUserは呼ばれないはず

      mockedFindExAppById.mockResolvedValue(mockExApp);

      const event = createAPIGatewayProxyEvent(regularTeamId, exAppId);
      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      expect(mockedIsTeamUser).not.toHaveBeenCalled();
    });

    test('COMMON_TEAM_IDの場合はチームメンバーでなくてもExAppを取得できる', async () => {
      mockedFindTeamById.mockResolvedValue({
        teamId: commonTeamId,
        teamName: '共通チーム',
        createdDate: now,
        updatedDate: now,
      });

      mockedIsSystemAdmin.mockReturnValue(false);
      // isTeamUserは呼ばれないはず

      mockedFindExAppById.mockResolvedValue({
        ...mockExApp,
        teamId: commonTeamId,
      });

      const event = createAPIGatewayProxyEvent(commonTeamId, exAppId);
      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      expect(mockedIsTeamUser).not.toHaveBeenCalled();
    });

    test('非SystemAdminかつ通常チームの場合、チームメンバーであればExAppを取得できる', async () => {
      mockedFindTeamById.mockResolvedValue({
        teamId: regularTeamId,
        teamName: 'テストチーム',
        createdDate: now,
        updatedDate: now,
      });

      mockedIsSystemAdmin.mockReturnValue(false);
      mockedIsTeamUser.mockResolvedValue(true);

      mockedFindExAppById.mockResolvedValue(mockExApp);

      const event = createAPIGatewayProxyEvent(regularTeamId, exAppId);
      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      expect(mockedIsTeamUser).toHaveBeenCalledWith(event, regularTeamId);
    });

    test('非SystemAdminかつ通常チームかつ非チームメンバーの場合は403エラーを返す', async () => {
      mockedFindTeamById.mockResolvedValue({
        teamId: regularTeamId,
        teamName: 'テストチーム',
        createdDate: now,
        updatedDate: now,
      });

      mockedIsSystemAdmin.mockReturnValue(false);
      mockedIsTeamUser.mockResolvedValue(false);

      const event = createAPIGatewayProxyEvent(regularTeamId, exAppId);
      const result = await handler(event);

      expect(result.statusCode).toBe(403);
      expect(JSON.parse(result.body)).toEqual({
        error: 'チームメンバーではないため利用できません。',
      });
      expect(mockedIsTeamUser).toHaveBeenCalledWith(event, regularTeamId);
    });

    test('SystemAdminかつCOMMON_TEAM_IDの場合もExAppを取得できる', async () => {
      mockedFindTeamById.mockResolvedValue({
        teamId: commonTeamId,
        teamName: '共通チーム',
        createdDate: now,
        updatedDate: now,
      });

      mockedIsSystemAdmin.mockReturnValue(true);

      mockedFindExAppById.mockResolvedValue({
        ...mockExApp,
        teamId: commonTeamId,
      });

      const event = createAPIGatewayProxyEvent(commonTeamId, exAppId);
      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      expect(mockedIsTeamUser).not.toHaveBeenCalled();
    });
  });
});
