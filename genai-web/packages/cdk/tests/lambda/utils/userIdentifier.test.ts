import { GenerateMacCommand, KMSClient } from '@aws-sdk/client-kms';
import { mockClient } from 'aws-sdk-client-mock';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { generateStableUserId } from '../../../lambda/utils/userIdentifier';

const kmsMock = mockClient(KMSClient);

describe('generateStableUserId', () => {
  // 環境変数の退避用
  const originalEnv = process.env;

  beforeEach(() => {
    kmsMock.reset();
    // 環境変数をリセットして、テストごとにクリーンな状態にする
    vi.resetModules();
    process.env = { ...originalEnv };
    process.env.USER_IDENTIFIER_HMAC_KEY_ID = 'test-key-id';
  });

  afterEach(() => {
    // 環境変数を元に戻す
    process.env = originalEnv;
  });

  it('should generate stable user ID from cognito sub', async () => {
    const mockMac = Buffer.from('0123456789abcdef0123456789abcdef', 'hex');
    kmsMock.on(GenerateMacCommand).resolves({ Mac: mockMac });

    const cognitoSub = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
    const stableId = await generateStableUserId(cognitoSub);

    expect(stableId).toBeDefined();
    expect(typeof stableId).toBe('string');
    expect(stableId.length).toBeGreaterThan(0);

    // Base64URL形式の検証 (A-Z, a-z, 0-9, -, _)
    expect(stableId).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('should generate same ID for same cognito sub', async () => {
    const mockMac = Buffer.from('0123456789abcdef0123456789abcdef', 'hex');
    kmsMock.on(GenerateMacCommand).resolves({ Mac: mockMac });

    const cognitoSub = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
    const stableId1 = await generateStableUserId(cognitoSub);
    const stableId2 = await generateStableUserId(cognitoSub);

    expect(stableId1).toBe(stableId2);
  });

  it('should throw error if cognitoSub is empty', async () => {
    await expect(generateStableUserId('')).rejects.toThrow('cognitoSub is required');
  });

  it('should throw error if USER_IDENTIFIER_HMAC_KEY_ID is not set', async () => {
    delete process.env.USER_IDENTIFIER_HMAC_KEY_ID;

    await expect(generateStableUserId('test-sub')).rejects.toThrow(
      'Environment variable USER_IDENTIFIER_HMAC_KEY_ID is not set',
    );
  });

  it('should throw error if KMS fails', async () => {
    const kmsError = new Error('KMS service unavailable');
    kmsMock.on(GenerateMacCommand).rejects(kmsError);

    await expect(generateStableUserId('test-sub')).rejects.toThrow('KMS service unavailable');
  });

  it('should throw error if KMS returns empty MAC', async () => {
    kmsMock.on(GenerateMacCommand).resolves({ Mac: undefined });

    await expect(generateStableUserId('test-sub')).rejects.toThrow(
      'KMS GenerateMac failed: No MAC returned',
    );
  });

  it('should generate different IDs for different cognito subs', async () => {
    const mockMac1 = Buffer.from('0123456789abcdef0123456789abcdef', 'hex');
    const mockMac2 = Buffer.from('fedcba9876543210fedcba9876543210', 'hex');

    kmsMock
      .on(GenerateMacCommand, {
        Message: Buffer.from('genai-web-user-id:user-1'),
      })
      .resolves({ Mac: mockMac1 })
      .on(GenerateMacCommand, {
        Message: Buffer.from('genai-web-user-id:user-2'),
      })
      .resolves({ Mac: mockMac2 });

    const stableId1 = await generateStableUserId('user-1');
    const stableId2 = await generateStableUserId('user-2');

    expect(stableId1).not.toBe(stableId2);
  });

  it('should use correct KMS parameters', async () => {
    const mockMac = Buffer.from('0123456789abcdef0123456789abcdef', 'hex');
    kmsMock.on(GenerateMacCommand).resolves({ Mac: mockMac });

    const cognitoSub = 'test-user-123';
    await generateStableUserId(cognitoSub);

    const calls = kmsMock.commandCalls(GenerateMacCommand);
    expect(calls.length).toBe(1);

    const commandInput = calls[0].args[0].input;
    expect(commandInput.KeyId).toBe('test-key-id');
    expect(commandInput.MacAlgorithm).toBe('HMAC_SHA_256');
    expect(commandInput.Message).toBeInstanceOf(Buffer);
  });

  it('should include domain prefix in message', async () => {
    kmsMock.on(GenerateMacCommand).resolves({
      Mac: Buffer.from('test', 'utf-8'),
    });

    const cognitoSub = 'test-sub';
    await generateStableUserId(cognitoSub);

    const calls = kmsMock.commandCalls(GenerateMacCommand);
    expect(calls.length).toBe(1);

    const message = Buffer.from(calls[0].args[0].input.Message as Uint8Array).toString();
    expect(message).toBe('genai-web-user-id:test-sub');
    expect(message).toContain('genai-web-user-id:');
    expect(message).toContain(cognitoSub);
  });

  it('should generate Base64URL with expected length for HMAC-SHA256', async () => {
    // HMAC-SHA256は32バイト（256ビット）
    const mockMac = Buffer.alloc(32, 0xff);
    kmsMock.on(GenerateMacCommand).resolves({ Mac: mockMac });

    const cognitoSub = 'test-user-length-check';
    const stableId = await generateStableUserId(cognitoSub);

    // Base64URLエンコード後は43文字（32バイト * 8ビット / 6ビット = 42.67 ≒ 43文字、パディングなし）
    expect(stableId.length).toBe(43);
    expect(stableId).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });
});
