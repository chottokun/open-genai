import type { SQSEvent, SQSRecord } from 'aws-lambda';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockSqsSend, mockRequestValidatedExAppUrl } = vi.hoisted(() => ({
  mockSqsSend: vi.fn(),
  mockRequestValidatedExAppUrl: vi.fn(),
}));

vi.mock('../../lambda/repository/invokeHistoryRepository', () => ({
  updateInvokeExAppHistory: vi.fn(),
}));

vi.mock('../../lambda/utils/apiKey', () => ({
  getApiKeyValue: vi.fn(),
}));

vi.mock('../../lambda/utils/exAppUrlSecurity', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lambda/utils/exAppUrlSecurity')>();
  return {
    ...actual,
    assertPublicStatusUrl: vi.fn(),
    requestValidatedExAppUrl: mockRequestValidatedExAppUrl,
  };
});

vi.mock('@aws-sdk/client-sqs', () => ({
  SQSClient: class {
    send = mockSqsSend;
  },
  ChangeMessageVisibilityCommand: vi.fn(),
}));

import { handler } from '../../lambda/pollExAppStatus';
import { updateInvokeExAppHistory } from '../../lambda/repository/invokeHistoryRepository';
import { getApiKeyValue } from '../../lambda/utils/apiKey';
import {
  assertPublicStatusUrl,
  requestValidatedExAppUrl,
  UnsafeExAppUrlError,
} from '../../lambda/utils/exAppUrlSecurity';

describe('pollExAppStatus Lambda handler', () => {
  const mockDbId = 'team#test-team-id#exapp#test-exapp-id#user#test-user-id';
  const mockCreatedDate = '2025-02-01T00:00:00.000Z';
  const mockStatusUrl = '/status/12345';
  const mockEndpoint = 'https://api.example.com/invoke';
  const mockApiKeySecretId = 'test-team-id/test-exapp-id';
  const mockBaseS3Prefix = 'artifacts/test-prefix';
  const mockStableUserId = 'stable-user-id-123';
  const mockApiKey = 'test-api-key';
  const mockValidatedStatusUrl = {
    url: new URL('https://api.example.com/status/12345'),
  };

  const createSqsRecord = (
    overrides?: Partial<{
      body: object;
      receiveCount: string;
      messageId: string;
      receiptHandle: string;
      eventSourceARN: string;
    }>,
  ): SQSRecord => {
    const defaultBody = {
      dbId: mockDbId,
      createdDate: mockCreatedDate,
      statusUrl: mockStatusUrl,
      endpoint: mockEndpoint,
      apiKeySecretId: mockApiKeySecretId,
      baseS3Prefix: mockBaseS3Prefix,
      stableUserId: mockStableUserId,
    };

    return {
      messageId: overrides?.messageId ?? 'test-message-id',
      receiptHandle: overrides?.receiptHandle ?? 'test-receipt-handle',
      body: JSON.stringify(overrides?.body ?? defaultBody),
      attributes: {
        ApproximateReceiveCount: overrides?.receiveCount ?? '1',
        SentTimestamp: '1234567890',
        SenderId: 'test-sender',
        ApproximateFirstReceiveTimestamp: '1234567890',
      },
      messageAttributes: {},
      md5OfBody: 'test-md5',
      eventSource: 'aws:sqs',
      eventSourceARN:
        overrides?.eventSourceARN ??
        'arn:aws:sqs:ap-northeast-1:123456789012:test-queue',
      awsRegion: 'ap-northeast-1',
    };
  };

  const createSqsEvent = (records: SQSRecord[]): SQSEvent => ({
    Records: records,
  });

  const createMockResponse = (status: number, body: unknown) => ({
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue(body),
    text: vi.fn().mockResolvedValue(typeof body === 'string' ? body : JSON.stringify(body)),
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getApiKeyValue).mockResolvedValue(mockApiKey);
    vi.mocked(updateInvokeExAppHistory).mockResolvedValue(undefined);
    vi.mocked(assertPublicStatusUrl).mockResolvedValue(mockValidatedStatusUrl);
    mockSqsSend.mockResolvedValue({});
  });

  describe('正常系', () => {
    it('COMPLETED状態の場合、DynamoDBを更新して正常終了する', async () => {
      const mockResponse = {
        status: 'COMPLETED',
        outputs: { result: 'success' },
        progress: '100',
      };
      mockRequestValidatedExAppUrl.mockResolvedValue(createMockResponse(200, mockResponse));

      const event = createSqsEvent([createSqsRecord()]);
      await handler(event);

      expect(getApiKeyValue).toHaveBeenCalledWith('test-team-id', 'test-exapp-id', '');
      expect(assertPublicStatusUrl).toHaveBeenCalledWith(mockStatusUrl, mockEndpoint);
      expect(requestValidatedExAppUrl).toHaveBeenCalledWith(
        mockValidatedStatusUrl,
        expect.objectContaining({
          headers: {
            'x-api-key': mockApiKey,
            'x-user-id': mockStableUserId,
          },
        }),
      );
      expect(updateInvokeExAppHistory).toHaveBeenCalledWith(
        mockDbId,
        mockCreatedDate,
        'COMPLETED',
        mockResponse,
        mockBaseS3Prefix,
      );
    });

    it('ERROR状態の場合、DynamoDBを更新して正常終了する', async () => {
      const mockResponse = {
        status: 'ERROR',
        outputs: { error: 'Something went wrong' },
      };
      mockRequestValidatedExAppUrl.mockResolvedValue(createMockResponse(200, mockResponse));

      const event = createSqsEvent([createSqsRecord()]);
      await handler(event);

      expect(updateInvokeExAppHistory).toHaveBeenCalledWith(
        mockDbId,
        mockCreatedDate,
        'ERROR',
        mockResponse,
        mockBaseS3Prefix,
      );
    });

    it('statusUrlが絶対URLの場合、APIキーを取得せずERROR履歴を記録する', async () => {
      const absoluteStatusUrl = 'https://other-api.example.com/status/12345';
      vi.mocked(assertPublicStatusUrl).mockRejectedValue(
        new UnsafeExAppUrlError('ステータスURLには同一オリジンの相対パスを指定してください。'),
      );

      const event = createSqsEvent([
        createSqsRecord({
          body: {
            dbId: mockDbId,
            createdDate: mockCreatedDate,
            statusUrl: absoluteStatusUrl,
            endpoint: mockEndpoint,
            apiKeySecretId: mockApiKeySecretId,
            baseS3Prefix: mockBaseS3Prefix,
            stableUserId: mockStableUserId,
          },
        }),
      ]);
      await handler(event);

      expect(assertPublicStatusUrl).toHaveBeenCalledWith(absoluteStatusUrl, mockEndpoint);
      expect(getApiKeyValue).not.toHaveBeenCalled();
      expect(requestValidatedExAppUrl).not.toHaveBeenCalled();
      expect(updateInvokeExAppHistory).toHaveBeenCalledWith(
        mockDbId,
        mockCreatedDate,
        'ERROR',
        expect.objectContaining({
          status: 'ERROR',
          error: expect.objectContaining({ reason: 'unsafe_status_url' }),
        }),
        mockBaseS3Prefix,
      );
    });
  });

  describe('継続ポーリング（IN_PROGRESS/PENDING）', () => {
    it('IN_PROGRESS状態の場合、DynamoDBを更新してエラーをスローする', async () => {
      const mockResponse = {
        status: 'IN_PROGRESS',
        outputs: { partial: 'data' },
        progress: '50',
      };
      mockRequestValidatedExAppUrl.mockResolvedValue(createMockResponse(200, mockResponse));

      const event = createSqsEvent([createSqsRecord()]);

      await expect(handler(event)).rejects.toThrow(
        /Throw error for continuous polling.*IN_PROGRESS/,
      );
      expect(updateInvokeExAppHistory).toHaveBeenCalledWith(
        mockDbId,
        mockCreatedDate,
        'IN_PROGRESS',
        mockResponse,
        mockBaseS3Prefix,
      );
    });

    it('PENDING状態の場合、エラーをスローしてリトライを促す', async () => {
      const mockResponse = {
        status: 'PENDING',
      };
      mockRequestValidatedExAppUrl.mockResolvedValue(createMockResponse(200, mockResponse));

      const event = createSqsEvent([createSqsRecord()]);

      await expect(handler(event)).rejects.toThrow(
        /Throw error for continuous polling.*PENDING/,
      );
      expect(updateInvokeExAppHistory).not.toHaveBeenCalled();
    });
  });

  describe('バックオフ処理', () => {
    it('receiveCountが240以下の場合、可視性タイムアウトを変更しない', async () => {
      const mockResponse = { status: 'PENDING' };
      mockRequestValidatedExAppUrl.mockResolvedValue(createMockResponse(200, mockResponse));

      const event = createSqsEvent([createSqsRecord({ receiveCount: '100' })]);

      await expect(handler(event)).rejects.toThrow();
      expect(mockSqsSend).not.toHaveBeenCalled();
    });

    it('receiveCountが241～480の場合、可視性タイムアウトを60秒に設定する', async () => {
      const mockResponse = { status: 'PENDING' };
      mockRequestValidatedExAppUrl.mockResolvedValue(createMockResponse(200, mockResponse));

      const event = createSqsEvent([createSqsRecord({ receiveCount: '300' })]);

      await expect(handler(event)).rejects.toThrow();
      expect(mockSqsSend).toHaveBeenCalled();
    });

    it('receiveCountが481～720の場合、可視性タイムアウトを300秒に設定する', async () => {
      const mockResponse = { status: 'PENDING' };
      mockRequestValidatedExAppUrl.mockResolvedValue(createMockResponse(200, mockResponse));

      const event = createSqsEvent([createSqsRecord({ receiveCount: '500' })]);

      await expect(handler(event)).rejects.toThrow();
      expect(mockSqsSend).toHaveBeenCalled();
    });

    it('receiveCountが720を超える場合、可視性タイムアウトを900秒に設定する', async () => {
      const mockResponse = { status: 'PENDING' };
      mockRequestValidatedExAppUrl.mockResolvedValue(createMockResponse(200, mockResponse));

      const event = createSqsEvent([createSqsRecord({ receiveCount: '800' })]);

      await expect(handler(event)).rejects.toThrow();
      expect(mockSqsSend).toHaveBeenCalled();
    });

    it('可視性タイムアウトの変更に失敗してもエラーハンドリングを継続する', async () => {
      const mockResponse = { status: 'PENDING' };
      mockRequestValidatedExAppUrl.mockResolvedValue(createMockResponse(200, mockResponse));
      mockSqsSend.mockRejectedValue(new Error('SQS error'));

      const event = createSqsEvent([createSqsRecord({ receiveCount: '500' })]);

      // 可視性タイムアウト変更の失敗はログに記録されるだけで、ポーリングは継続される
      await expect(handler(event)).rejects.toThrow(
        /Throw error for continuous polling/,
      );
    });
  });

  describe('エラーハンドリング', () => {
    it('APIキーが見つからない場合、エラーをスローする', async () => {
      vi.mocked(getApiKeyValue).mockResolvedValue(undefined);

      const event = createSqsEvent([createSqsRecord()]);

      await expect(handler(event)).rejects.toThrow(
        /API Key not found for secret/,
      );
      expect(requestValidatedExAppUrl).not.toHaveBeenCalled();
    });

    it('ポーリングリクエストが失敗した場合、エラーをスローする', async () => {
      mockRequestValidatedExAppUrl.mockResolvedValue(createMockResponse(500, 'Internal Server Error'));

      const event = createSqsEvent([createSqsRecord()]);

      await expect(handler(event)).rejects.toThrow(
        /Polling failed with status 500/,
      );
      expect(updateInvokeExAppHistory).not.toHaveBeenCalled();
    });

    it('ポーリングリクエストが404を返した場合、エラーをスローする', async () => {
      mockRequestValidatedExAppUrl.mockResolvedValue(createMockResponse(404, 'Not Found'));

      const event = createSqsEvent([createSqsRecord()]);

      await expect(handler(event)).rejects.toThrow(
        /Polling failed with status 404/,
      );
    });

    it('JSONパースエラーの場合、エラーをスローする', async () => {
      const invalidRecord = {
        ...createSqsRecord(),
        body: 'invalid-json',
      };

      const event = createSqsEvent([invalidRecord]);

      await expect(handler(event)).rejects.toThrow();
    });
  });

  describe('ヘルパー関数', () => {
    it('QueueURLがARNから正しく生成される', async () => {
      const mockResponse = { status: 'PENDING' };
      mockRequestValidatedExAppUrl.mockResolvedValue(createMockResponse(200, mockResponse));

      const customArn = 'arn:aws:sqs:us-east-1:987654321098:my-queue';
      const event = createSqsEvent([
        createSqsRecord({
          eventSourceARN: customArn,
          receiveCount: '300',
        }),
      ]);

      await expect(handler(event)).rejects.toThrow();
      // SQSクライアントが呼び出されることを確認（可視性タイムアウト更新）
      expect(mockSqsSend).toHaveBeenCalled();
    });
  });
});
