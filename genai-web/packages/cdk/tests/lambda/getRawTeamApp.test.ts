import { APIGatewayProxyEvent } from 'aws-lambda';
import { afterAll, beforeEach, describe, expect, type MockedFunction, test, vi } from 'vitest';
import { handler } from '../../lambda/getRawTeamApp';
import { findRawExAppById } from '../../lambda/repository/exAppRepository';
import * as teamRole from '../../lambda/utils/teamRole';

vi.mock('../../lambda/repository/exAppRepository');
vi.mock('../../lambda/utils/teamRole', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lambda/utils/teamRole')>();
  return {
    ...actual,
    isSystemAdmin: vi.fn(),
    isTeamAdmin: vi.fn(),
  };
});

const mockedFindRawExAppById = findRawExAppById as MockedFunction<typeof findRawExAppById>;
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

function createAPIGatewayProxyEvent(teamId?: string, exAppId?: string): APIGatewayProxyEvent {
  return {
    body: null,
    pathParameters: { teamId, exAppId },
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

describe('getRawTeamApp Lambda handler', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  test('システム管理者がExAppをRaw形式で正常に取得できる', async () => {
    const teamId = 'test-team-id';
    const exAppId = 'target-exapp-id';
    const now = Date.now().toString();

    mockedIsSystemAdmin.mockReturnValue(true);
    mockedIsTeamAdmin.mockResolvedValue(false);

    mockedFindRawExAppById.mockResolvedValue({
      pk: { S: `team#${teamId}` },
      sk: { S: `exapp#${exAppId}` },
      exAppName: { S: 'テストアプリ' },
      description: { S: 'テストアプリの概要' },
      endpoint: { S: 'https://api.example.com/test' },
      createdDate: { S: now },
      updatedDate: { S: now },
    });

    const event = createAPIGatewayProxyEvent(teamId, exAppId);

    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    expect(mockedFindRawExAppById).toHaveBeenCalledWith(teamId, exAppId);

    const body = JSON.parse(result.body);
    expect(body.pk.S).toBe(`team#${teamId}`);
    expect(body.exAppName.S).toBe('テストアプリ');
  });

  test('チーム管理者がExAppをRaw形式で正常に取得できる', async () => {
    const teamId = 'test-team-id';
    const exAppId = 'target-exapp-id';
    const now = Date.now().toString();

    mockedIsSystemAdmin.mockReturnValue(false);
    mockedIsTeamAdmin.mockResolvedValue(true);

    mockedFindRawExAppById.mockResolvedValue({
      pk: { S: `team#${teamId}` },
      sk: { S: `exapp#${exAppId}` },
      exAppName: { S: 'テストアプリ' },
      description: { S: 'テストアプリの概要' },
      endpoint: { S: 'https://api.example.com/test' },
      createdDate: { S: now },
      updatedDate: { S: now },
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

  test('管理者でない場合は403エラーを返す', async () => {
    const teamId = 'test-team-id';
    const exAppId = 'exapp-id';

    mockedIsSystemAdmin.mockReturnValue(false);
    mockedIsTeamAdmin.mockResolvedValue(false);

    const event = createAPIGatewayProxyEvent(teamId, exAppId);

    const result = await handler(event);

    expect(result.statusCode).toBe(403);
    expect(JSON.parse(result.body)).toEqual({
      error: '管理者ではないため利用できません。',
    });
  });

  test('ExAppが見つからない場合は400エラーを返す', async () => {
    const teamId = 'test-team-id';
    const exAppId = 'nonexistent-exapp-id';

    mockedIsSystemAdmin.mockReturnValue(true);
    mockedIsTeamAdmin.mockResolvedValue(false);

    mockedFindRawExAppById.mockResolvedValue(null);

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

    mockedIsSystemAdmin.mockReturnValue(true);
    mockedIsTeamAdmin.mockResolvedValue(false);
    mockedFindRawExAppById.mockRejectedValue(new Error('Unexpected error'));

    const event = createAPIGatewayProxyEvent(teamId, exAppId);

    const result = await handler(event);

    expect(result.statusCode).toBe(500);
    expect(JSON.parse(result.body)).toEqual({
      error: 'サーバ側でエラーが発生しました。管理者へご連絡ください。',
    });
  });
});
