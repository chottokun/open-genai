import { BedrockRuntimeClient, ConverseCommand } from '@aws-sdk/client-bedrock-runtime';
import { mockClient } from 'aws-sdk-client-mock';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import bedrockApi from '../../../lambda/utils/bedrockApi';
import { mockEnvironment } from '../testUtils';

const bedrockMock = mockClient(BedrockRuntimeClient);

describe('bedrockApi', () => {
  let restoreEnv: () => void;

  beforeEach(() => {
    bedrockMock.reset();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    if (restoreEnv) {
      restoreEnv();
    }
    vi.restoreAllMocks();
  });

  describe('BedrockRuntimeClient singleton behavior', () => {
    test('複数回呼び出しても正常に動作する（singletonによる接続再利用）', async () => {
      restoreEnv = mockEnvironment({
        MODEL_REGION: 'us-east-1',
      });

      bedrockMock.on(ConverseCommand).resolves({
        output: {
          message: {
            role: 'assistant',
            content: [{ text: 'Test response' }],
          },
        },
        stopReason: 'end_turn',
        usage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 },
      });

      // 複数回呼び出しても正常に動作することを確認
      const result1 = await bedrockApi.invoke(
        { type: 'bedrock', modelId: 'anthropic.claude-3-sonnet-20240229-v1:0' },
        [{ role: 'user', content: 'Hello' }],
        'test-id-1',
      );

      const result2 = await bedrockApi.invoke(
        { type: 'bedrock', modelId: 'anthropic.claude-3-sonnet-20240229-v1:0' },
        [{ role: 'user', content: 'Hello again' }],
        'test-id-2',
      );

      // 両方のリクエストが成功することを確認
      expect(result1).toBe('Test response');
      expect(result2).toBe('Test response');

      // 2回のAPI呼び出しが行われたことを確認
      expect(bedrockMock.calls()).toHaveLength(2);
    });

    test('通常の認証情報でBedrockRuntimeClientが正常に動作する', async () => {
      restoreEnv = mockEnvironment({
        MODEL_REGION: 'ap-northeast-1',
      });

      bedrockMock.on(ConverseCommand).resolves({
        output: {
          message: {
            role: 'assistant',
            content: [{ text: 'Test response' }],
          },
        },
        stopReason: 'end_turn',
        usage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 },
      });

      const result = await bedrockApi.invoke(
        { type: 'bedrock', modelId: 'anthropic.claude-3-sonnet-20240229-v1:0' },
        [{ role: 'user', content: 'Hello' }],
        'test-id',
      );

      expect(result).toBe('Test response');
      expect(bedrockMock.calls()).toHaveLength(1);
    });
  });

  describe('CredentialsProvider with AssumeRole', () => {
    test('CROSS_ACCOUNT_BEDROCK_ROLE_ARNが設定されている場合も正常に動作する', async () => {
      restoreEnv = mockEnvironment({
        MODEL_REGION: 'us-west-2',
        CROSS_ACCOUNT_BEDROCK_ROLE_ARN: 'arn:aws:iam::123456789012:role/BedrockAccessRole',
      });

      bedrockMock.on(ConverseCommand).resolves({
        output: {
          message: {
            role: 'assistant',
            content: [{ text: 'Cross-account response' }],
          },
        },
        stopReason: 'end_turn',
        usage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 },
      });

      const result = await bedrockApi.invoke(
        { type: 'bedrock', modelId: 'anthropic.claude-3-sonnet-20240229-v1:0' },
        [{ role: 'user', content: 'Cross-account test' }],
        'test-id',
      );

      expect(result).toBe('Cross-account response');
      expect(bedrockMock.calls()).toHaveLength(1);
    });

    test('CROSS_ACCOUNT_BEDROCK_ROLE_ARNが設定されている場合も複数回呼び出しで正常に動作する', async () => {
      restoreEnv = mockEnvironment({
        MODEL_REGION: 'eu-west-1',
        CROSS_ACCOUNT_BEDROCK_ROLE_ARN: 'arn:aws:iam::987654321098:role/BedrockRole',
      });

      bedrockMock.on(ConverseCommand).resolves({
        output: {
          message: {
            role: 'assistant',
            content: [{ text: 'Response' }],
          },
        },
        stopReason: 'end_turn',
        usage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 },
      });

      // 3回連続呼び出し
      await bedrockApi.invoke(
        { type: 'bedrock', modelId: 'anthropic.claude-3-sonnet-20240229-v1:0' },
        [{ role: 'user', content: 'Test 1' }],
        'test-id-1',
      );
      await bedrockApi.invoke(
        { type: 'bedrock', modelId: 'anthropic.claude-3-sonnet-20240229-v1:0' },
        [{ role: 'user', content: 'Test 2' }],
        'test-id-2',
      );
      await bedrockApi.invoke(
        { type: 'bedrock', modelId: 'anthropic.claude-3-sonnet-20240229-v1:0' },
        [{ role: 'user', content: 'Test 3' }],
        'test-id-3',
      );

      // 3回のAPI呼び出しが行われたことを確認
      expect(bedrockMock.calls()).toHaveLength(3);
    });
  });

  describe('inference profile ARN mapping', () => {
    test('INFERENCE_PROFILE_MAPが設定されている場合、モデルIDをInference Profile ARNにマッピングする', async () => {
      const profileMap = {
        'anthropic.claude-3-sonnet-20240229-v1:0':
          'arn:aws:bedrock:us-east-1:123456789012:inference-profile/us.anthropic.claude-3-sonnet-20240229-v1:0',
      };

      restoreEnv = mockEnvironment({
        MODEL_REGION: 'us-east-1',
        INFERENCE_PROFILE_MAP: JSON.stringify(profileMap),
      });

      bedrockMock.on(ConverseCommand).resolves({
        output: {
          message: {
            role: 'assistant',
            content: [{ text: 'Inference profile response' }],
          },
        },
        stopReason: 'end_turn',
        usage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 },
      });

      const result = await bedrockApi.invoke(
        { type: 'bedrock', modelId: 'anthropic.claude-3-sonnet-20240229-v1:0' },
        [{ role: 'user', content: 'Test' }],
        'test-id',
      );

      expect(result).toBe('Inference profile response');

      // ConverseCommandの呼び出し引数を確認
      const calls = bedrockMock.calls();
      expect(calls).toHaveLength(1);
      const commandInput = calls[0].args[0].input;
      expect(commandInput.modelId).toBe(
        'arn:aws:bedrock:us-east-1:123456789012:inference-profile/us.anthropic.claude-3-sonnet-20240229-v1:0',
      );
    });

    test('INFERENCE_PROFILE_MAPが不正なJSONの場合、元のモデルIDを使用する', async () => {
      restoreEnv = mockEnvironment({
        MODEL_REGION: 'us-east-1',
        INFERENCE_PROFILE_MAP: 'invalid-json',
      });

      bedrockMock.on(ConverseCommand).resolves({
        output: {
          message: {
            role: 'assistant',
            content: [{ text: 'Fallback response' }],
          },
        },
        stopReason: 'end_turn',
        usage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 },
      });

      const result = await bedrockApi.invoke(
        { type: 'bedrock', modelId: 'anthropic.claude-3-sonnet-20240229-v1:0' },
        [{ role: 'user', content: 'Test' }],
        'test-id',
      );

      expect(result).toBe('Fallback response');

      // console.warnが呼ばれたことを確認
      expect(console.warn).toHaveBeenCalledWith(
        'Failed to parse INFERENCE_PROFILE_MAP, using original model ID',
      );

      // 元のモデルIDが使用されていることを確認
      const calls = bedrockMock.calls();
      expect(calls).toHaveLength(1);
      const commandInput = calls[0].args[0].input;
      expect(commandInput.modelId).toBe('anthropic.claude-3-sonnet-20240229-v1:0');
    });
  });
});
