import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { handler } from '../../lambda/listInvokeExAppHistories';

vi.mock('../../lambda/repository/teamRepository', () => ({
  findTeamById: vi.fn(),
}));

vi.mock('../../lambda/repository/exAppRepository', () => ({
  findExAppById: vi.fn(),
}));

vi.mock('../../lambda/repository/invokeHistoryRepository', () => ({
  listInvokeExAppHistories: vi.fn(),
}));

import { findExAppById } from '../../lambda/repository/exAppRepository';
import { listInvokeExAppHistories } from '../../lambda/repository/invokeHistoryRepository';
import { findTeamById } from '../../lambda/repository/teamRepository';

describe('listInvokeExAppHistories Lambda handler', () => {
  const mockUserId = 'test-user-id';
  const mockTeamId = 'test-team-id';
  const mockExAppId = 'test-exapp-id';

  const mockTeam = {
    teamId: mockTeamId,
    teamName: 'Test Team',
    createdDate: '1234567890',
    updatedDate: '1234567890',
  };

  const mockExApp = {
    teamId: mockTeamId,
    exAppId: mockExAppId,
    exAppName: 'Test ExApp',
    endpoint: 'https://example.com/api',
    placeholder: '{}',
    description: 'Test description',
    howToUse: 'Test how to use',
    apiKey: '',
    config: '{}',
    systemPrompt: '',
    systemPromptKeyName: '',
    copyable: true,
    status: 'published' as const,
    createdDate: '1234567890',
    updatedDate: '1234567890',
  };

  const mockHistories = {
    history: [
      {
        teamId: mockTeamId,
        teamName: 'Test Team',
        exAppId: mockExAppId,
        exAppName: 'Test ExApp',
        userId: mockUserId,
        inputs: { prompt: 'test1' },
        outputs: '{"result": "response1"}',
        createdDate: '2025-01-01T00:00:00Z',
        status: 'COMPLETED' as const,
        progress: '100',
      },
      {
        teamId: mockTeamId,
        teamName: 'Test Team',
        exAppId: mockExAppId,
        exAppName: 'Test ExApp',
        userId: mockUserId,
        inputs: { prompt: 'test2' },
        outputs: '{"result": "response2"}',
        createdDate: '2025-01-02T00:00:00Z',
        status: 'COMPLETED' as const,
        progress: '100',
      },
    ],
    lastEvaluatedKey: undefined,
  };

  const createEvent = (queryParams?: Record<string, string>): APIGatewayProxyEvent =>
    ({
      queryStringParameters: queryParams ?? null,
      requestContext: {
        authorizer: {
          claims: {
            sub: mockUserId,
          },
        },
      },
    }) as unknown as APIGatewayProxyEvent;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('履歴一覧を正常に取得できる', async () => {
    vi.mocked(findTeamById).mockResolvedValue(mockTeam);
    vi.mocked(findExAppById).mockResolvedValue(mockExApp);
    vi.mocked(listInvokeExAppHistories).mockResolvedValue(mockHistories);

    const event = createEvent({
      teamId: mockTeamId,
      exAppId: mockExAppId,
    });

    const result: APIGatewayProxyResult = await handler(event);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body).toEqual(mockHistories);
    expect(findTeamById).toHaveBeenCalledWith(mockTeamId);
    expect(findExAppById).toHaveBeenCalledWith(mockTeamId, mockExAppId);
    expect(listInvokeExAppHistories).toHaveBeenCalledWith(mockTeamId, mockExAppId, mockUserId, null);
  });

  it('exclusiveStartKeyを指定して履歴一覧を取得できる', async () => {
    vi.mocked(findTeamById).mockResolvedValue(mockTeam);
    vi.mocked(findExAppById).mockResolvedValue(mockExApp);
    vi.mocked(listInvokeExAppHistories).mockResolvedValue(mockHistories);

    const exclusiveStartKey = { pk: 'test-pk', sk: 'test-sk' };
    const event = createEvent({
      teamId: mockTeamId,
      exAppId: mockExAppId,
      exclusiveStartKey: JSON.stringify(exclusiveStartKey),
    });

    const result: APIGatewayProxyResult = await handler(event);

    expect(result.statusCode).toBe(200);
    expect(listInvokeExAppHistories).toHaveBeenCalledWith(
      mockTeamId,
      mockExAppId,
      mockUserId,
      exclusiveStartKey,
    );
  });

  it('exclusiveStartKeyが空文字の場合はnullとして扱われる', async () => {
    vi.mocked(findTeamById).mockResolvedValue(mockTeam);
    vi.mocked(findExAppById).mockResolvedValue(mockExApp);
    vi.mocked(listInvokeExAppHistories).mockResolvedValue(mockHistories);

    const event = createEvent({
      teamId: mockTeamId,
      exAppId: mockExAppId,
      exclusiveStartKey: '',
    });

    const result: APIGatewayProxyResult = await handler(event);

    expect(result.statusCode).toBe(200);
    expect(listInvokeExAppHistories).toHaveBeenCalledWith(mockTeamId, mockExAppId, mockUserId, null);
  });

  it('queryStringParametersがnullの場合は400エラーを返す', async () => {
    const event = createEvent();
    event.queryStringParameters = null;

    const result: APIGatewayProxyResult = await handler(event);

    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.error).toBe('パラメータが不正です。');
  });

  it('teamIdがない場合は400エラーを返す', async () => {
    const event = createEvent({
      exAppId: mockExAppId,
    });

    const result: APIGatewayProxyResult = await handler(event);

    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.error).toBe('パラメータが不正です。');
  });

  it('exAppIdがない場合は400エラーを返す', async () => {
    const event = createEvent({
      teamId: mockTeamId,
    });

    const result: APIGatewayProxyResult = await handler(event);

    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.error).toBe('パラメータが不正です。');
  });

  it('チームが見つからない場合は400エラーを返す', async () => {
    vi.mocked(findTeamById).mockResolvedValue(null);
    vi.mocked(findExAppById).mockResolvedValue(mockExApp);

    const event = createEvent({
      teamId: mockTeamId,
      exAppId: mockExAppId,
    });

    const result: APIGatewayProxyResult = await handler(event);

    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.error).toBe('パラメータが不正です。');
  });

  it('ExAppが見つからない場合は400エラーを返す', async () => {
    vi.mocked(findTeamById).mockResolvedValue(mockTeam);
    vi.mocked(findExAppById).mockResolvedValue(null);

    const event = createEvent({
      teamId: mockTeamId,
      exAppId: mockExAppId,
    });

    const result: APIGatewayProxyResult = await handler(event);

    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.error).toBe('パラメータが不正です。');
  });

  it('予期しないエラーが発生した場合は500エラーを返す', async () => {
    vi.mocked(findTeamById).mockRejectedValue(new Error('Unexpected error'));

    const event = createEvent({
      teamId: mockTeamId,
      exAppId: mockExAppId,
    });

    const result: APIGatewayProxyResult = await handler(event);

    expect(result.statusCode).toBe(500);
    const body = JSON.parse(result.body);
    expect(body.error).toBe('サーバ側でエラーが発生しました。管理者へご連絡ください。');
  });
});
