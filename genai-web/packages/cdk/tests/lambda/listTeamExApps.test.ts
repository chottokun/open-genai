import { APIGatewayProxyEvent } from 'aws-lambda';
import { afterAll, beforeEach, describe, expect, type MockedFunction, test, vi } from 'vitest';
import { handler } from '../../lambda/listTeamExApps';
import { listExApps } from '../../lambda/repository/exAppRepository';
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

const mockedListExApps = listExApps as MockedFunction<typeof listExApps>;
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

describe('listTeamExApps Lambda handler', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  test('システム管理者がチームのExApp一覧を取得できる', async () => {
    const teamId = 'test-team-id';
    const now = Date.now().toString();

    mockedIsSystemAdmin.mockReturnValue(true);
    mockedIsTeamAdmin.mockResolvedValue(false);

    mockedListExApps.mockResolvedValue({
      exApps: [
        {
          teamId,
          exAppId: 'exapp-1',
          exAppName: 'アプリ1',
          description: 'アプリ1の概要',
          howToUse: 'アプリ1の使い方',
          endpoint: 'https://api.example.com/app1',
          apiKey: '',
          placeholder: '{}',
          config: '{}',
          systemPrompt: '',
          systemPromptKeyName: '',
          copyable: true,
          status: 'published',
          createdDate: now,
          updatedDate: now,
        },
        {
          teamId,
          exAppId: 'exapp-2',
          exAppName: 'アプリ2',
          description: 'アプリ2の概要',
          howToUse: 'アプリ2の使い方',
          endpoint: 'https://api.example.com/app2',
          apiKey: '',
          placeholder: '{}',
          config: '{}',
          systemPrompt: '',
          systemPromptKeyName: '',
          copyable: false,
          status: 'draft',
          createdDate: now,
          updatedDate: now,
        },
      ],
      lastEvaluatedKey: undefined,
    });

    const event = createAPIGatewayProxyEvent(teamId);

    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    expect(mockedListExApps).toHaveBeenCalledWith(expect.any(Number), teamId, undefined);

    const body = JSON.parse(result.body);
    expect(body.teamExApps).toHaveLength(2);
    expect(body.teamExApps[0].exAppId).toBe('exapp-1');
    expect(body.teamExApps[1].exAppId).toBe('exapp-2');
  });

  test('チーム管理者がチームのExApp一覧を取得できる', async () => {
    const teamId = 'test-team-id';
    const now = Date.now().toString();

    mockedIsSystemAdmin.mockReturnValue(false);
    mockedIsTeamAdmin.mockResolvedValue(true);

    mockedListExApps.mockResolvedValue({
      exApps: [
        {
          teamId,
          exAppId: 'exapp-1',
          exAppName: 'アプリ1',
          description: 'アプリ1の概要',
          howToUse: 'アプリ1の使い方',
          endpoint: 'https://api.example.com/app1',
          apiKey: '',
          placeholder: '{}',
          config: '{}',
          systemPrompt: '',
          systemPromptKeyName: '',
          copyable: true,
          status: 'published',
          createdDate: now,
          updatedDate: now,
        },
      ],
      lastEvaluatedKey: undefined,
    });

    const event = createAPIGatewayProxyEvent(teamId);

    const result = await handler(event);

    expect(result.statusCode).toBe(200);
  });

  test('ページネーションを利用できる', async () => {
    const teamId = 'test-team-id';
    const now = Date.now().toString();
    const exclusiveStartKey = 'encoded-key';

    mockedIsSystemAdmin.mockReturnValue(true);
    mockedIsTeamAdmin.mockResolvedValue(false);

    mockedListExApps.mockResolvedValue({
      exApps: [
        {
          teamId,
          exAppId: 'exapp-3',
          exAppName: 'アプリ3',
          description: 'アプリ3の概要',
          howToUse: 'アプリ3の使い方',
          endpoint: 'https://api.example.com/app3',
          apiKey: '',
          placeholder: '{}',
          config: '{}',
          systemPrompt: '',
          systemPromptKeyName: '',
          copyable: true,
          status: 'published',
          createdDate: now,
          updatedDate: now,
        },
      ],
      lastEvaluatedKey: 'next-key',
    });

    const event = createAPIGatewayProxyEvent(teamId, { exclusiveStartKey });

    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    expect(mockedListExApps).toHaveBeenCalledWith(expect.any(Number), teamId, exclusiveStartKey);

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
    expect(mockedListExApps).not.toHaveBeenCalled();
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
    expect(mockedListExApps).not.toHaveBeenCalled();
  });

  test('予期しないエラーが発生した場合は500エラーを返す', async () => {
    const teamId = 'test-team-id';
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    mockedIsSystemAdmin.mockReturnValue(true);
    mockedIsTeamAdmin.mockResolvedValue(false);
    mockedListExApps.mockRejectedValue(new Error('Unexpected error'));

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
