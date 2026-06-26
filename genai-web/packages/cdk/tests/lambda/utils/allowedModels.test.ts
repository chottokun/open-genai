import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { mockEnvironment } from '../testUtils';

describe('allowedModels', () => {
  let restoreEnv: (() => void) | undefined;

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    restoreEnv?.();
    restoreEnv = undefined;
    vi.restoreAllMocks();
  });

  const loadAllowedModels = async () => {
    restoreEnv = mockEnvironment({
      MODEL_IDS: JSON.stringify(['anthropic.claude-3-sonnet-20240229-v1:0']),
      IMAGE_GENERATION_MODEL_IDS: JSON.stringify(['stability.stable-image-core-v1:0']),
      INFERENCE_PROFILE_MAP: JSON.stringify({
        'anthropic.claude-3-sonnet-20240229-v1:0':
          'arn:aws:bedrock:us-east-1:123456789012:inference-profile/us.anthropic.claude-3-sonnet-20240229-v1:0',
      }),
    });

    return import('../../../lambda/utils/allowedModels');
  };

  const expectModelNotAllowedError = (fn: () => unknown) => {
    try {
      fn();
    } catch (error) {
      expect(error).toMatchObject({
        message: 'このモデルは使用できません。',
        statusCode: 400,
      });
      return;
    }

    throw new Error('Expected HttpError to be thrown');
  };

  test('text model 未指定時は defaultModel を返す', async () => {
    const { resolveAllowedTextModel } = await loadAllowedModels();

    expect(resolveAllowedTextModel()).toEqual({
      type: 'bedrock',
      modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
      sessionId: undefined,
    });
  });

  test('allowlist内の sagemaker model はそのまま返す', async () => {
    const { resolveAllowedTextModel } = await loadAllowedModels();

    expect(
      resolveAllowedTextModel({
        type: 'sagemaker',
        modelId: 'my-endpoint',
      }),
    ).toEqual({
      type: 'sagemaker',
      modelId: 'my-endpoint',
      sessionId: undefined,
    });
  });

  test('allowlist外の bedrock model は拒否する', async () => {
    const { resolveAllowedTextModel } = await loadAllowedModels();

    expectModelNotAllowedError(() =>
      resolveAllowedTextModel({
        type: 'bedrock',
        modelId: 'custom-model',
      }),
    );
  });

  test('inference profile ARN の直接指定は拒否する', async () => {
    const { resolveAllowedTextModel } = await loadAllowedModels();

    expectModelNotAllowedError(() =>
      resolveAllowedTextModel({
        type: 'bedrock',
        modelId:
          'arn:aws:bedrock:us-east-1:123456789012:inference-profile/us.anthropic.claude-3-sonnet-20240229-v1:0',
      }),
    );
  });

  test('unknown model type は拒否する', async () => {
    const { resolveAllowedTextModel } = await loadAllowedModels();

    expectModelNotAllowedError(() =>
      resolveAllowedTextModel({
        type: 'unknown',
        modelId: 'custom-model',
      }),
    );
  });

  test('bedrockAgent type は未知 type として拒否する', async () => {
    const { resolveAllowedTextModel } = await loadAllowedModels();

    expectModelNotAllowedError(() =>
      resolveAllowedTextModel({
        type: 'bedrockAgent',
        modelId: 'unused-agent',
      }),
    );
  });

  test('allowlist内の image model はそのまま返す', async () => {
    const { resolveAllowedImageModel } = await loadAllowedModels();

    expect(
      resolveAllowedImageModel({
        type: 'bedrock',
        modelId: 'stability.stable-image-core-v1:0',
      }),
    ).toEqual({
      type: 'bedrock',
      modelId: 'stability.stable-image-core-v1:0',
      sessionId: undefined,
    });
  });

});
