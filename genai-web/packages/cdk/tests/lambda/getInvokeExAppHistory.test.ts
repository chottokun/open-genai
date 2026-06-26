import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { handler } from '../../lambda/getInvokeExAppHistory';

vi.mock('../../lambda/repository/teamRepository', () => ({
  findTeamById: vi.fn(),
}));

vi.mock('../../lambda/repository/exAppRepository', () => ({
  findExAppById: vi.fn(),
}));

vi.mock('../../lambda/repository/invokeHistoryRepository', () => ({
  findInvokeExAppHistory: vi.fn(),
}));

import { findExAppById } from '../../lambda/repository/exAppRepository';
import { findInvokeExAppHistory } from '../../lambda/repository/invokeHistoryRepository';
import { findTeamById } from '../../lambda/repository/teamRepository';

describe('getInvokeExAppHistory Lambda handler', () => {
  const mockUserId = 'test-user-id';
  const mockTeamId = 'test-team-id';
  const mockExAppId = 'test-exapp-id';
  const mockCreatedDate = '2025-01-01T00:00:00Z';

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

  const mockHistory = {
    history: {
      teamId: mockTeamId,
      teamName: 'Test Team',
      exAppId: mockExAppId,
      exAppName: 'Test ExApp',
      userId: mockUserId,
      inputs: { prompt: 'test' },
      outputs: '{"result": "test response"}',
      createdDate: mockCreatedDate,
      status: 'COMPLETED' as const,
      progress: '100',
    },
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

  it('履歴を正常に取得できる', async () => {
    vi.mocked(findTeamById).mockResolvedValue(mockTeam);
    vi.mocked(findExAppById).mockResolvedValue(mockExApp);
    vi.mocked(findInvokeExAppHistory).mockResolvedValue(mockHistory);

    const event = createEvent({
      teamId: mockTeamId,
      exAppId: mockExAppId,
      createdDate: mockCreatedDate,
    });

    const result: APIGatewayProxyResult = await handler(event);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body).toEqual(mockHistory);
    expect(findTeamById).toHaveBeenCalledWith(mockTeamId);
    expect(findExAppById).toHaveBeenCalledWith(mockTeamId, mockExAppId);
    expect(findInvokeExAppHistory).toHaveBeenCalledWith(
      mockTeamId,
      mockExAppId,
      mockUserId,
      mockCreatedDate,
    );
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
      createdDate: mockCreatedDate,
    });

    const result: APIGatewayProxyResult = await handler(event);

    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.error).toBe('パラメータが不正です。');
  });

  it('exAppIdがない場合は400エラーを返す', async () => {
    const event = createEvent({
      teamId: mockTeamId,
      createdDate: mockCreatedDate,
    });

    const result: APIGatewayProxyResult = await handler(event);

    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.error).toBe('パラメータが不正です。');
  });

  it('createdDateがない場合は400エラーを返す', async () => {
    vi.mocked(findTeamById).mockResolvedValue(mockTeam);
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

  it('チームが見つからない場合は400エラーを返す', async () => {
    vi.mocked(findTeamById).mockResolvedValue(null);
    vi.mocked(findExAppById).mockResolvedValue(mockExApp);

    const event = createEvent({
      teamId: mockTeamId,
      exAppId: mockExAppId,
      createdDate: mockCreatedDate,
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
      createdDate: mockCreatedDate,
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
      createdDate: mockCreatedDate,
    });

    const result: APIGatewayProxyResult = await handler(event);

    expect(result.statusCode).toBe(500);
    const body = JSON.parse(result.body);
    expect(body.error).toBe('サーバ側でエラーが発生しました。管理者へご連絡ください。');
  });
});
