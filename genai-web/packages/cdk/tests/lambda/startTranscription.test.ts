import { APIGatewayProxyEvent } from 'aws-lambda';
import { afterAll, beforeEach, describe, expect, test, vi } from 'vitest';

const { mockTranscribeSend, mockStartTranscriptionJobCommand, mockResolveIdentityId } = vi.hoisted(
  () => ({
    mockTranscribeSend: vi.fn(),
    mockStartTranscriptionJobCommand: vi.fn(),
    mockResolveIdentityId: vi.fn(),
  }),
);

vi.mock('@aws-sdk/client-transcribe', () => ({
  TranscribeClient: class {
    send = mockTranscribeSend;
  },
  StartTranscriptionJobCommand: class {
    constructor(input: unknown) {
      mockStartTranscriptionJobCommand(input);
    }
  },
}));

vi.mock('../../lambda/utils/cognitoIdentity', () => ({
  resolveIdentityId: mockResolveIdentityId,
}));

import { handler } from '../../lambda/startTranscription';

const originalEnv = process.env;
beforeEach(() => {
  vi.resetAllMocks();
  process.env = {
    ...originalEnv,
    AUDIO_BUCKET_NAME: 'test-audio-bucket',
    TRANSCRIPT_BUCKET_NAME: 'test-transcript-bucket',
    APP_ENV: 'test',
  };
});

afterAll(() => {
  process.env = originalEnv;
});

function createEvent(
  body: Record<string, unknown>,
  headers: Record<string, string> = { Authorization: 'Bearer test-id-token' },
): APIGatewayProxyEvent {
  return {
    body: JSON.stringify(body),
    headers,
    pathParameters: {},
    requestContext: {
      authorizer: { claims: { sub: 'test-user-id' } },
    },
  } as unknown as APIGatewayProxyEvent;
}

describe('startTranscription Lambda handler', () => {
  test('自分の新規キーは s3:// に組み立てて Transcribe を起動する', async () => {
    mockResolveIdentityId.mockResolvedValue('ap-northeast-1:owner');
    mockTranscribeSend.mockResolvedValue({
      TranscriptionJob: { TranscriptionJobName: 'job-123' },
    });

    const event = createEvent({
      audioKey: 'ap-northeast-1:owner/uuid/audio.mp3',
      speakerLabel: true,
      maxSpeakers: 3,
    });
    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body)).toEqual({ jobName: 'job-123' });
    const commandInput = mockStartTranscriptionJobCommand.mock.calls[0][0];
    expect(commandInput.Media.MediaFileUri).toBe(
      's3://test-audio-bucket/ap-northeast-1:owner/uuid/audio.mp3',
    );
  });

  test('他人の新規キーは 403', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockResolveIdentityId.mockResolvedValue('ap-northeast-1:me');

    const event = createEvent({
      audioKey: 'ap-northeast-1:attacker/uuid/audio.mp3',
      speakerLabel: false,
    });
    const result = await handler(event);

    expect(result.statusCode).toBe(403);
    expect(mockTranscribeSend).not.toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  test('新規キーで Authorization ヘッダー無しは 401', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const event = createEvent(
      { audioKey: 'ap-northeast-1:owner/uuid/audio.mp3', speakerLabel: false },
      {},
    );
    const result = await handler(event);

    expect(result.statusCode).toBe(401);
    expect(mockTranscribeSend).not.toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  test('Transcribe エラー時は 500 を返す', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockResolveIdentityId.mockResolvedValue('ap-northeast-1:owner');
    mockTranscribeSend.mockRejectedValue(new Error('Transcribe error'));

    const event = createEvent({
      audioKey: 'ap-northeast-1:owner/uuid/audio.mp3',
      speakerLabel: false,
    });
    const result = await handler(event);

    expect(result.statusCode).toBe(500);
    expect(JSON.parse(result.body)).toEqual({
      error: 'サーバ側でエラーが発生しました。管理者へご連絡ください。',
    });
    consoleErrorSpy.mockRestore();
  });
});
