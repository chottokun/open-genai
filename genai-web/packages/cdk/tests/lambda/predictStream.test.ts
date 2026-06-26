import { Context } from 'aws-lambda';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { HttpError } from '../../lambda/utils/httpError';

type StreamifyResponse = <T extends (...args: never[]) => unknown>(fn: T) => T;
type AwsLambdaGlobal = typeof globalThis & {
  awslambda?: {
    streamifyResponse: StreamifyResponse;
  };
};

const runtime = globalThis as AwsLambdaGlobal;

const { mockInvokeStream, mockResolveAllowedTextModel } = vi.hoisted(() => ({
  mockInvokeStream: vi.fn(),
  mockResolveAllowedTextModel: vi.fn(),
}));

vi.mock('../../lambda/utils/api', () => ({
  default: {
    bedrock: { invokeStream: mockInvokeStream },
    sagemaker: { invokeStream: mockInvokeStream },
  },
}));

vi.mock('../../lambda/utils/allowedModels', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lambda/utils/allowedModels')>();
  return {
    ...actual,
    resolveAllowedTextModel: mockResolveAllowedTextModel,
  };
});

describe('predictStream Lambda handler', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.resetAllMocks();
    runtime.awslambda = {
      streamifyResponse: ((fn) => fn) as StreamifyResponse,
    };
    mockResolveAllowedTextModel.mockImplementation((model) => {
      return model ?? { type: 'bedrock', modelId: 'test-model' };
    });
  });

  test('allowlist内のモデルでstreamをそのまま返す', async () => {
    mockInvokeStream.mockImplementation(async function* () {
      yield '{"text":"hello"}\n';
      yield '{"text":" world"}\n';
    });

    const { predictStreamHandler } = await import('../../lambda/predictStream');
    const responseStream = {
      write: vi.fn(),
      end: vi.fn(),
    };
    const context = { callbackWaitsForEmptyEventLoop: true } as Context;

    await predictStreamHandler(
      {
        messages: [{ role: 'user', content: 'hello' }],
        id: 'req-1',
      },
      responseStream,
      context,
    );

    expect(context.callbackWaitsForEmptyEventLoop).toBe(false);
    expect(mockInvokeStream).toHaveBeenCalledWith(
      { type: 'bedrock', modelId: 'test-model' },
      [{ role: 'user', content: 'hello' }],
      'req-1',
    );
    expect(responseStream.write).toHaveBeenNthCalledWith(1, '{"text":"hello"}\n');
    expect(responseStream.write).toHaveBeenNthCalledWith(2, '{"text":" world"}\n');
    expect(responseStream.end).toHaveBeenCalledTimes(1);
  });

  test('allowlist外のモデルでerror chunkを返して終了する', async () => {
    mockResolveAllowedTextModel.mockImplementation(() => {
      throw new HttpError(400, 'このモデルは使用できません。');
    });

    const { predictStreamHandler } = await import('../../lambda/predictStream');
    const responseStream = {
      write: vi.fn(),
      end: vi.fn(),
    };

    await predictStreamHandler(
      {
        messages: [{ role: 'user', content: 'hello' }],
        id: 'req-2',
        model: { type: 'bedrock', modelId: 'custom-model' },
      },
      responseStream,
      { callbackWaitsForEmptyEventLoop: true } as Context,
    );

    expect(mockInvokeStream).not.toHaveBeenCalled();
    expect(responseStream.write).toHaveBeenCalledWith(
      '{"text":"このモデルは使用できません。","stopReason":"error"}\n',
    );
    expect(responseStream.end).toHaveBeenCalledTimes(1);
  });
});
