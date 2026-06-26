import { Logger } from '@aws-lambda-powertools/logger';
import { SQSEvent, SQSRecord } from 'aws-lambda';
import { updateInvokeExAppHistory } from './repository/invokeHistoryRepository';
import { getApiKeyValue } from './utils/apiKey';
import {
  assertPublicStatusUrl,
  requestValidatedExAppUrl,
  UnsafeExAppUrlError,
  type ValidatedExAppUrl,
} from './utils/exAppUrlSecurity';
import { changeMessageVisibility } from './utils/sqsApi';
import { truncate } from './utils/truncate';

const logger = new Logger();
const APP_ENV = process.env.APP_ENV || '';

const getQueueUrlFromArn = (arn: string): string => {
  const parts = arn.split(':');
  const region = parts[3];
  const accountId = parts[4];
  const queueName = parts[5];
  return `https://sqs.${region}.amazonaws.com/${accountId}/${queueName}`;
};

// バックオフ用の可視性タイムアウトを決定する
const getVisibilityTimeoutForBackoff = (receiveCount: number): number | null => {
  if (receiveCount > 720) {
    return 900; // 15分間隔で累積96時間まで
  }
  if (receiveCount > 480) {
    return 300; // 5分間隔で累積26時間まで
  }
  if (receiveCount > 240) {
    return 60; // 1分間隔で4時間まで（累積6時間）
  }
  return null; // 2時間まではデフォルトの30秒を利用
};

// SQSメッセージの可視性タイムアウトをバックオフ付きで更新する
const updateMessageVisibilityWithBackoff = async (record: SQSRecord): Promise<void> => {
  const receiveCount = parseInt(record.attributes.ApproximateReceiveCount, 10);
  const newVisibilityTimeout = getVisibilityTimeoutForBackoff(receiveCount);

  if (newVisibilityTimeout !== null) {
    try {
      const queueUrl = getQueueUrlFromArn(record.eventSourceARN);
      await changeMessageVisibility(queueUrl, record.receiptHandle, newVisibilityTimeout);
    } catch (e) {
      // 可視性タイムアウトの変更に失敗しても、次のポーリングは続行されるべきなので、エラーはログに記録するだけ
      logger.error('Failed to change message visibility', e as Error);
    }
  }
};

export const handler = async (event: SQSEvent): Promise<void> => {
  for (const record of event.Records) {
    try {
      const sqsMessage = JSON.parse(record.body);

      const { dbId, createdDate, statusUrl, endpoint, apiKeySecretId, baseS3Prefix, stableUserId } =
        sqsMessage;

      let validatedStatusUrl: ValidatedExAppUrl;
      try {
        validatedStatusUrl = await assertPublicStatusUrl(statusUrl, endpoint);
      } catch (error) {
        if (error instanceof UnsafeExAppUrlError) {
          logger.warn('Rejected unsafe ExApp status URL', {
            dbId,
            createdDate,
            reason: error.message,
          });
          await updateInvokeExAppHistory(
            dbId,
            createdDate,
            'ERROR',
            {
              status: 'ERROR',
              error: {
                message: 'ステータスURLが安全ではないため処理を中断しました。',
                reason: 'unsafe_status_url',
              },
            },
            baseS3Prefix,
          );
          continue;
        }
        throw error;
      }

      // apiKeySecretId は内部識別子として "teamId/exAppId" の形式でinvokeExAppからSQS経由で渡される
      // 実際のSecrets Manager名は getApiKeyValue() 内で命名規則に従って組み立てられる
      const [teamId, exAppId] = apiKeySecretId.split('/');
      const apiKey = await getApiKeyValue(teamId, exAppId, APP_ENV);

      if (!apiKey) {
        throw new Error(`API Key not found for secret: ${apiKeySecretId}`);
      }

      const headers = {
        'x-api-key': apiKey,
        'x-user-id': stableUserId,
      };

      const response = await requestValidatedExAppUrl(validatedStatusUrl, { headers });

      if (!response.ok) {
        const responseBody = await response.text();
        logger.error(`Failed to poll status. Status: ${response.status}`, {
          dbId,
          createdDate,
          statusUrl: validatedStatusUrl.url.toString(),
          responseStatus: response.status,
          responseBody: truncate(responseBody),
        });
        // エラーをスローしてSQSで再試行させる
        throw new Error(`Polling failed with status ${response.status}`);
      }

      const result = await response.json();
      if (typeof result !== 'object' || result === null || !('status' in result)) {
        throw new Error('Polling response status is missing');
      }
      const status = (result as { status: unknown }).status; // PENDING, IN_PROGRESS, COMPLETED, ERROR
      if (typeof status !== 'string') {
        throw new Error('Polling response status is invalid');
      }

      if (status === 'COMPLETED' || status === 'ERROR') {
        // 終了状態ならDynamoDBを更新 (ファイル保存はリポジトリ層に委譲)
        await updateInvokeExAppHistory(
          dbId, // PK
          createdDate, // SK
          status,
          result,
          baseS3Prefix,
        );
        // 処理が終了（COMPLETE/ERROR）したので、正常終了する。EventSourceMappingによりSQSのキューは削除される
      } else if (status === 'IN_PROGRESS') {
        // 進行中ならDynamoDBを更新 (ファイル保存はリポジトリ層に委譲)
        await updateInvokeExAppHistory(
          dbId, // PK
          createdDate, // SK
          status,
          result,
          baseS3Prefix,
        );
        // 再試行前に必要なら可視性タイムアウトを延長
        await updateMessageVisibilityWithBackoff(record);
        // 処理が進行中なのでエラーをスローしてSQSで再試行させる
        throw new Error(
          `Throw error for continuous polling. Record ${dbId}/${createdDate} is still in progress. Status: ${status}`,
        );
      } else {
        // 再試行前に必要なら可視性タイムアウトを延長
        await updateMessageVisibilityWithBackoff(record);
        // 処理が未完了なのでエラーをスローしてSQSで再試行させる
        throw new Error(
          `Throw error for continuous polling. Record ${dbId}/${createdDate} is still pending. Status: ${status}`,
        );
      }
    } catch (error) {
      logger.error('Error processing SQS record', error as Error);
      // エラーを再スローしてSQSの再試行メカニズムに委ねる
      throw error;
    }
  }
};
