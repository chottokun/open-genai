import { APIGatewayProxyEvent } from 'aws-lambda';
import { afterAll, beforeEach, describe, expect, type MockedFunction, test, vi } from 'vitest';
import { handler } from '../../lambda/deleteExApp';
import { deleteExApp, findExAppById } from '../../lambda/repository/exAppRepository';
import * as teamRole from '../../lambda/utils/teamRole';
import * as apiKey from '../../lambda/utils/apiKey';

vi.mock('../../lambda/repository/exAppRepository');
vi.mock('../../lambda/utils/teamRole', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lambda/utils/teamRole')>();
  return {
    ...actual,
    isSystemAdmin: vi.fn(),
    isTeamAdmin: vi.fn(),
  };
});
vi.mock('../../lambda/utils/apiKey', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lambda/utils/apiKey')>();
  return {
    ...actual,
    deleteApiKey: vi.fn(),
  };
});

const mockedDeleteExApp = deleteExApp as MockedFunction<typeof deleteExApp>;
const mockedFindExAppById = findExAppById as MockedFunction<typeof findExAppById>;
const mockedIsSystemAdmin = teamRole.isSystemAdmin as MockedFunction<
  typeof teamRole.isSystemAdmin
>;
const mockedIsTeamAdmin = teamRole.isTeamAdmin as MockedFunction<
  typeof teamRole.isTeamAdmin
>;
const mockedDeleteApiKey = apiKey.deleteApiKey as MockedFunction<
  typeof apiKey.deleteApiKey
>;

const originalEnv = process.env;
beforeEach(() => {
  vi.resetModules();
  process.env = { ...originalEnv };
  process.env.APP_ENV = 'test';
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

describe('deleteExApp Lambda handler', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  test('システム管理者がExAppを正常に削除できる', async () => {
    const teamId = 'test-team-id';
    const exAppId = 'target-exapp-id';
    const now = Date.now().toString();

    mockedIsSystemAdmin.mockReturnValue(true);
    mockedIsTeamAdmin.mockResolvedValue(false);

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
      status: 'draft',
      createdDate: now,
      updatedDate: now,
    });

    mockedDeleteExApp.mockResolvedValue(undefined);
    mockedDeleteApiKey.mockResolvedValue(undefined);

    const event = createAPIGatewayProxyEvent(teamId, exAppId);

    const result = await handler(event);

    expect(result.statusCode).toBe(204);
    expect(result.body).toBe('');
    expect(mockedDeleteExApp).toHaveBeenCalledWith(teamId, exAppId);
    expect(mockedDeleteApiKey).toHaveBeenCalledWith(teamId, exAppId, expect.any(String));
  });

  test('チーム管理者がExAppを正常に削除できる', async () => {
    const teamId = 'test-team-id';
    const exAppId = 'target-exapp-id';
    const now = Date.now().toString();

    mockedIsSystemAdmin.mockReturnValue(false);
    mockedIsTeamAdmin.mockResolvedValue(true);

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
      status: 'draft',
      createdDate: now,
      updatedDate: now,
    });

    mockedDeleteExApp.mockResolvedValue(undefined);
    mockedDeleteApiKey.mockResolvedValue(undefined);

    const event = createAPIGatewayProxyEvent(teamId, exAppId);

    const result = await handler(event);

    expect(result.statusCode).toBe(204);
  });

  test('管理者でない場合は403エラーを返す', async () => {
    const teamId = 'test-team-id';
    const exAppId = 'target-exapp-id';

    mockedIsSystemAdmin.mockReturnValue(false);
    mockedIsTeamAdmin.mockResolvedValue(false);

    const event = createAPIGatewayProxyEvent(teamId, exAppId);

    const result = await handler(event);

    expect(result.statusCode).toBe(403);
    expect(JSON.parse(result.body)).toEqual({
      error: '管理者ではないため利用できません。',
    });
    expect(mockedDeleteExApp).not.toHaveBeenCalled();
  });

  test('削除対象のExAppが見つからない場合は404エラーを返す', async () => {
    const teamId = 'test-team-id';
    const exAppId = 'nonexistent-exapp-id';

    mockedIsSystemAdmin.mockReturnValue(true);
    mockedIsTeamAdmin.mockResolvedValue(false);

    mockedFindExAppById.mockResolvedValue(null);

    const event = createAPIGatewayProxyEvent(teamId, exAppId);

    const result = await handler(event);

    expect(result.statusCode).toBe(404);
    expect(JSON.parse(result.body)).toEqual({
      error: '削除対象のAIアプリが見つかりませんでした。',
    });
    expect(mockedDeleteExApp).not.toHaveBeenCalled();
  });

  test('予期しないエラーが発生した場合は500エラーを返す', async () => {
    const teamId = 'test-team-id';
    const exAppId = 'target-exapp-id';
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    mockedIsSystemAdmin.mockReturnValue(true);
    mockedIsTeamAdmin.mockResolvedValue(false);
    mockedFindExAppById.mockRejectedValue(new Error('Unexpected error'));

    const event = createAPIGatewayProxyEvent(teamId, exAppId);

    const result = await handler(event);

    expect(result.statusCode).toBe(500);
    expect(JSON.parse(result.body)).toEqual({
      error: 'サーバ側でエラーが発生しました。管理者へご連絡ください。',
    });
    expect(consoleErrorSpy).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });
});
