import { APIGatewayProxyEvent } from 'aws-lambda';
import { beforeEach, describe, expect, test, vi } from 'vitest';

const { mockTranscribeSend, mockS3Send } = vi.hoisted(() => ({
  mockTranscribeSend: vi.fn(),
  mockS3Send: vi.fn(),
}));

vi.mock('@aws-sdk/client-transcribe', () => ({
  TranscribeClient: class {
    send = mockTranscribeSend;
  },
  GetTranscriptionJobCommand: vi.fn(),
}));

vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: class {
    send = mockS3Send;
  },
  GetObjectCommand: vi.fn(),
}));

import { handler } from '../../lambda/getTranscription';

function createEvent(jobName: string, userId = 'test-user-id'): APIGatewayProxyEvent {
  return {
    body: null,
    pathParameters: { jobName },
    requestContext: {
      authorizer: { claims: { sub: userId } },
    },
  } as unknown as APIGatewayProxyEvent;
}

function createEventWithoutJobName(userId = 'test-user-id'): APIGatewayProxyEvent {
  return {
    body: null,
    pathParameters: {},
    requestContext: {
      authorizer: { claims: { sub: userId } },
    },
  } as unknown as APIGatewayProxyEvent;
}

describe('getTranscription Lambda handler', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  test('IN_PROGRESSのジョブのステータスを返す', async () => {
    mockTranscribeSend.mockResolvedValue({
      TranscriptionJob: {
        TranscriptionJobStatus: 'IN_PROGRESS',
        Tags: [{ Key: 'userId', Value: 'test-user-id' }],
      },
    });

    const event = createEvent('job-123');
    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body)).toEqual({ status: 'IN_PROGRESS' });
  });

  test('COMPLETEDのジョブの文字起こし結果を返す', async () => {
    mockTranscribeSend.mockResolvedValue({
      TranscriptionJob: {
        TranscriptionJobStatus: 'COMPLETED',
        Tags: [{ Key: 'userId', Value: 'test-user-id' }],
        Transcript: {
          TranscriptFileUri: 'https://s3.ap-northeast-1.amazonaws.com/bucket/output.json',
        },
      },
    });

    mockS3Send.mockResolvedValue({
      Body: {
        transformToString: () =>
          JSON.stringify({
            results: {
              language_code: 'ja-JP',
              audio_segments: [
                { speaker_label: 'spk_0', transcript: 'こんにちは 世界' },
                { speaker_label: 'spk_1', transcript: 'ありがとう' },
              ],
            },
          }),
      },
    });

    const event = createEvent('job-123');
    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.status).toBe('COMPLETED');
    expect(body.languageCode).toBe('ja-JP');
    expect(body.transcripts).toEqual([
      { speakerLabel: 'spk_0', transcript: 'こんにちは世界' },
      { speakerLabel: 'spk_1', transcript: 'ありがとう' },
    ]);
  });

  test('連続する同一話者のセグメントをマージする', async () => {
    mockTranscribeSend.mockResolvedValue({
      TranscriptionJob: {
        TranscriptionJobStatus: 'COMPLETED',
        Tags: [{ Key: 'userId', Value: 'test-user-id' }],
        Transcript: {
          TranscriptFileUri: 'https://s3.ap-northeast-1.amazonaws.com/bucket/output.json',
        },
      },
    });

    mockS3Send.mockResolvedValue({
      Body: {
        transformToString: () =>
          JSON.stringify({
            results: {
              language_code: 'en-US',
              audio_segments: [
                { speaker_label: 'spk_0', transcript: 'Hello' },
                { speaker_label: 'spk_0', transcript: 'world' },
                { speaker_label: 'spk_1', transcript: 'Thanks' },
              ],
            },
          }),
      },
    });

    const event = createEvent('job-123');
    const result = await handler(event);

    const body = JSON.parse(result.body);
    expect(body.transcripts).toEqual([
      { speakerLabel: 'spk_0', transcript: 'Hello world' },
      { speakerLabel: 'spk_1', transcript: 'Thanks' },
    ]);
  });

  test('jobNameがない場合は400エラーを返す', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const event = createEventWithoutJobName();
    const result = await handler(event);

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body)).toEqual({ error: 'パラメータが不正です。' });
    expect(mockTranscribeSend).not.toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });

  test('他のユーザーのジョブにアクセスすると403を返す', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    mockTranscribeSend.mockResolvedValue({
      TranscriptionJob: {
        TranscriptionJobStatus: 'IN_PROGRESS',
        Tags: [{ Key: 'userId', Value: 'other-user-id' }],
      },
    });

    const event = createEvent('job-123', 'test-user-id');
    const result = await handler(event);

    expect(result.statusCode).toBe(403);
    expect(JSON.parse(result.body)).toEqual({ error: 'Forbidden' });

    consoleErrorSpy.mockRestore();
  });

  test('エラー時は500を返す', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockTranscribeSend.mockRejectedValue(new Error('Transcribe error'));

    const event = createEvent('job-123');
    const result = await handler(event);

    expect(result.statusCode).toBe(500);
    expect(JSON.parse(result.body)).toEqual({
      error: 'サーバ側でエラーが発生しました。管理者へご連絡ください。',
    });

    consoleErrorSpy.mockRestore();
  });
});
