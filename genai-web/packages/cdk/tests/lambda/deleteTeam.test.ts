import { APIGatewayProxyEvent } from 'aws-lambda';
import { afterAll, beforeEach, describe, expect, type MockedFunction, test, vi } from 'vitest';
import { handler } from '../../lambda/deleteTeam';
import * as client from '../../lambda/repository/client';
import { transactDeleteItems } from '../../lambda/repository/commonRepository';
import { listExApps } from '../../lambda/repository/exAppRepository';
import { findTeamById } from '../../lambda/repository/teamRepository';
import { listTeamUsers } from '../../lambda/repository/teamUserRepository';
import * as teamRole from '../../lambda/utils/teamRole';
import * as apiKey from '../../lambda/utils/apiKey';

vi.mock('../../lambda/repository/client', () => ({
  dynamoDbDocument: {
    send: vi.fn(),
  },
  EXAPP_TABLE_NAME: 'test-exapp-table',
  TABLE_NAME: 'test-table',
}));
vi.mock('../../lambda/repository/commonRepository');
vi.mock('../../lambda/repository/exAppRepository');
vi.mock('../../lambda/repository/teamRepository');
vi.mock('../../lambda/repository/teamUserRepository');
vi.mock('../../lambda/utils/teamRole', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lambda/utils/teamRole')>();
  return {
    ...actual,
    isSystemAdmin: vi.fn(),
  };
});
vi.mock('../../lambda/utils/apiKey', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lambda/utils/apiKey')>();
  return {
    ...actual,
    deleteApiKey: vi.fn(),
  };
});

const mockedTransactDeleteItems = transactDeleteItems as MockedFunction<typeof transactDeleteItems>;
const mockedIsSystemAdmin = teamRole.isSystemAdmin as MockedFunction<
  typeof teamRole.isSystemAdmin
>;
const mockedFindTeamById = findTeamById as MockedFunction<typeof findTeamById>;
const mockedListExApps = listExApps as MockedFunction<typeof listExApps>;
const mockedListTeamUsers = listTeamUsers as MockedFunction<typeof listTeamUsers>;
const mockedDeleteApiKey = apiKey.deleteApiKey as MockedFunction<typeof apiKey.deleteApiKey>;
const mockedDynamoDbDocumentSend = client.dynamoDbDocument.send as MockedFunction<
  typeof client.dynamoDbDocument.send
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

describe('deleteTeam Lambda handler', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  test('システム管理者がチームを正常に削除できる', async () => {
    const teamId = 'test-team-id';

    mockedIsSystemAdmin.mockReturnValue(true);
    mockedFindTeamById.mockResolvedValue({ teamId, teamName: 'test' } as any);
    mockedListTeamUsers.mockResolvedValue({ teamUsers: [], lastEvaluatedKey: undefined });
    mockedListExApps.mockResolvedValue({ exApps: [], lastEvaluatedKey: undefined });
    mockedTransactDeleteItems.mockResolvedValue(undefined);

    const event = createAPIGatewayProxyEvent(teamId);

    const result = await handler(event);

    expect(result.statusCode).toBe(204);
    expect(result.body).toBe('');
    expect(mockedFindTeamById).toHaveBeenCalledWith(teamId);
    expect(mockedTransactDeleteItems).toHaveBeenCalled();
  });

  test('チームユーザーとExAppを含めて削除できる', async () => {
    const teamId = 'test-team-id';

    mockedIsSystemAdmin.mockReturnValue(true);
    mockedFindTeamById.mockResolvedValue({ teamId, teamName: 'test' } as any);
    mockedListTeamUsers.mockResolvedValue({
      teamUsers: [
        { teamId, userId: 'user1', isAdmin: false } as any,
        { teamId, userId: 'user2', isAdmin: false } as any,
      ],
      lastEvaluatedKey: undefined,
    });
    mockedListExApps.mockResolvedValue({
      exApps: [{ teamId, exAppId: 'app1' } as any],
      lastEvaluatedKey: undefined,
    });
    mockedDeleteApiKey.mockResolvedValue(undefined);
    mockedTransactDeleteItems.mockResolvedValue(undefined);
    mockedDynamoDbDocumentSend.mockResolvedValue({ UnprocessedItems: {} } as any);

    const event = createAPIGatewayProxyEvent(teamId);

    const result = await handler(event);

    expect(result.statusCode).toBe(204);
    expect(mockedDeleteApiKey).toHaveBeenCalledWith(teamId, 'app1', expect.any(String));
    // Team + TeamUser は旧テーブル (transactDeleteItems) で削除
    expect(mockedTransactDeleteItems).toHaveBeenCalledWith(
      expect.arrayContaining([
        { Key: { pk: `team#${teamId}`, sk: 'team' } },
        { Key: { pk: `team#${teamId}`, sk: 'user#user1' } },
        { Key: { pk: `team#${teamId}`, sk: 'user#user2' } },
      ]),
    );
    // ExApp は新テーブル (batchDeleteExApps → dynamoDbDocument.send) で削除
    expect(mockedDynamoDbDocumentSend).toHaveBeenCalled();
  });

  test('システム管理者でない場合は403エラーを返す', async () => {
    const teamId = 'test-team-id';

    mockedIsSystemAdmin.mockReturnValue(false);

    const event = createAPIGatewayProxyEvent(teamId);

    const result = await handler(event);

    expect(result.statusCode).toBe(403);
    expect(JSON.parse(result.body)).toEqual({
      error: '管理者ではないため利用できません。',
    });
    expect(mockedFindTeamById).not.toHaveBeenCalled();
  });

  test('teamIdがない場合は400エラーを返す', async () => {
    mockedIsSystemAdmin.mockReturnValue(true);

    const event = createAPIGatewayProxyEvent();

    const result = await handler(event);

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body)).toEqual({
      error: 'パラメータが不正です。',
    });
    expect(mockedFindTeamById).not.toHaveBeenCalled();
  });

  test('UnprocessedItemsがある場合にリトライして削除が完了する', async () => {
    const teamId = 'test-team-id';

    mockedIsSystemAdmin.mockReturnValue(true);
    mockedFindTeamById.mockResolvedValue({ teamId, teamName: 'test' } as any);
    mockedListTeamUsers.mockResolvedValue({ teamUsers: [], lastEvaluatedKey: undefined });
    mockedListExApps.mockResolvedValue({
      exApps: [
        { teamId, exAppId: 'app1' } as any,
        { teamId, exAppId: 'app2' } as any,
      ],
      lastEvaluatedKey: undefined,
    });
    mockedDeleteApiKey.mockResolvedValue(undefined);
    mockedTransactDeleteItems.mockResolvedValue(undefined);

    mockedDynamoDbDocumentSend
      .mockResolvedValueOnce({
        UnprocessedItems: {
          'test-exapp-table': [
            { DeleteRequest: { Key: { pk: `team#${teamId}`, sk: 'exapp#app2' } } },
          ],
        },
      } as any)
      .mockResolvedValueOnce({ UnprocessedItems: {} } as any);

    const event = createAPIGatewayProxyEvent(teamId);

    const result = await handler(event);

    expect(result.statusCode).toBe(204);
    expect(mockedDynamoDbDocumentSend).toHaveBeenCalledTimes(2);
  });

  test('UnprocessedItemsのリトライが上限に達した場合は500エラーを返す', async () => {
    const teamId = 'test-team-id';
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    mockedIsSystemAdmin.mockReturnValue(true);
    mockedFindTeamById.mockResolvedValue({ teamId, teamName: 'test' } as any);
    mockedListTeamUsers.mockResolvedValue({ teamUsers: [], lastEvaluatedKey: undefined });
    mockedListExApps.mockResolvedValue({
      exApps: [{ teamId, exAppId: 'app1' } as any],
      lastEvaluatedKey: undefined,
    });
    mockedDeleteApiKey.mockResolvedValue(undefined);
    mockedTransactDeleteItems.mockResolvedValue(undefined);

    mockedDynamoDbDocumentSend.mockResolvedValue({
      UnprocessedItems: {
        'test-exapp-table': [
          { DeleteRequest: { Key: { pk: `team#${teamId}`, sk: 'exapp#app1' } } },
        ],
      },
    } as any);

    const event = createAPIGatewayProxyEvent(teamId);

    const result = await handler(event);

    expect(result.statusCode).toBe(500);
    expect(JSON.parse(result.body)).toEqual({
      error: 'サーバ側でエラーが発生しました。管理者へご連絡ください。',
    });

    consoleErrorSpy.mockRestore();
  });

  test('予期しないエラーが発生した場合は500エラーを返す', async () => {
    const teamId = 'test-team-id';
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    mockedIsSystemAdmin.mockReturnValue(true);
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