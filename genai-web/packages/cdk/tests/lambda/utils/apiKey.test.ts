import {
  CreateSecretCommand,
  DeleteSecretCommand,
  GetSecretValueCommand,
  PutSecretValueCommand,
  SecretsManagerClient,
} from '@aws-sdk/client-secrets-manager';
import { mockClient } from 'aws-sdk-client-mock';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { deleteApiKey, getApiKeyValue, setApiKey } from '../../../lambda/utils/apiKey';

const secretsManagerMock = mockClient(SecretsManagerClient);

describe('apiKey', () => {
  beforeEach(() => {
    secretsManagerMock.reset();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  describe('getApiKeyValue', () => {
    test('新しい命名規則でAPIキーを取得できる', async () => {
      const teamId = 'team-1';
      const exAppId = 'app-1';
      const appEnv = 'dev';
      const expectedApiKey = 'secret-api-key';

      secretsManagerMock.on(GetSecretValueCommand).resolves({
        SecretString: expectedApiKey,
      });

      const result = await getApiKeyValue(teamId, exAppId, appEnv);

      expect(result).toBe(expectedApiKey);
    });

    test('appEnvが空の場合、旧命名規則のSecretIdを使用する', async () => {
      const teamId = 'team-1';
      const exAppId = 'app-1';
      const expectedApiKey = 'secret-api-key';

      secretsManagerMock.on(GetSecretValueCommand).resolves({
        SecretString: expectedApiKey,
      });

      const result = await getApiKeyValue(teamId, exAppId, '');

      expect(result).toBe(expectedApiKey);
    });

    test('新しい命名規則で見つからない場合、旧命名規則にフォールバックする', async () => {
      const teamId = 'team-1';
      const exAppId = 'app-1';
      const appEnv = 'dev';
      const expectedApiKey = 'legacy-api-key';

      const resourceNotFoundError = new Error('Secret not found');
      resourceNotFoundError.name = 'ResourceNotFoundException';

      secretsManagerMock
        .on(GetSecretValueCommand, { SecretId: `${appEnv}/${teamId}/${exAppId}` })
        .rejects(resourceNotFoundError)
        .on(GetSecretValueCommand, { SecretId: `${teamId}/${exAppId}` })
        .resolves({ SecretString: expectedApiKey });

      const result = await getApiKeyValue(teamId, exAppId, appEnv);

      expect(result).toBe(expectedApiKey);
    });

    test('両方の命名規則で見つからない場合、undefinedを返す', async () => {
      const teamId = 'team-1';
      const exAppId = 'app-1';
      const appEnv = 'dev';

      const resourceNotFoundError = new Error('Secret not found');
      resourceNotFoundError.name = 'ResourceNotFoundException';

      secretsManagerMock.on(GetSecretValueCommand).rejects(resourceNotFoundError);

      const result = await getApiKeyValue(teamId, exAppId, appEnv);

      expect(result).toBeUndefined();
    });

    test('その他のエラーの場合、undefinedを返す', async () => {
      const teamId = 'team-1';
      const exAppId = 'app-1';

      secretsManagerMock.on(GetSecretValueCommand).rejects(new Error('Unknown error'));

      const result = await getApiKeyValue(teamId, exAppId);

      expect(result).toBeUndefined();
    });
  });

  describe('setApiKey', () => {
    test('既存のSecretがある場合、更新する', async () => {
      const teamId = 'team-1';
      const exAppId = 'app-1';
      const apiKey = 'new-api-key';
      const appEnv = 'dev';

      secretsManagerMock
        .on(GetSecretValueCommand)
        .resolves({ SecretString: 'old-api-key' })
        .on(PutSecretValueCommand)
        .resolves({});

      await setApiKey(teamId, exAppId, apiKey, appEnv);

      expect(secretsManagerMock.calls()).toHaveLength(2);
    });

    test('既存のSecretがない場合、新規作成する', async () => {
      const teamId = 'team-1';
      const exAppId = 'app-1';
      const apiKey = 'new-api-key';
      const appEnv = 'dev';

      const resourceNotFoundError = new Error('Secret not found');
      resourceNotFoundError.name = 'ResourceNotFoundException';

      secretsManagerMock
        .on(GetSecretValueCommand)
        .rejects(resourceNotFoundError)
        .on(CreateSecretCommand)
        .resolves({});

      await setApiKey(teamId, exAppId, apiKey, appEnv);

      // 1. GetSecretValueCommand (新命名規則確認)
      // 2. CreateSecretCommand (新規作成)
      // 3. GetSecretValueCommand (旧命名規則確認 - マイグレーション用)
      expect(secretsManagerMock.calls()).toHaveLength(3);
    });

    test('PutSecretValueが失敗した場合、エラーをスローする', async () => {
      const teamId = 'team-1';
      const exAppId = 'app-1';
      const apiKey = 'new-api-key';

      secretsManagerMock
        .on(GetSecretValueCommand)
        .resolves({ SecretString: 'old-api-key' })
        .on(PutSecretValueCommand)
        .rejects(new Error('Put failed'));

      await expect(setApiKey(teamId, exAppId, apiKey)).rejects.toThrow(
        'Put failed',
      );
    });

    test('CreateSecretが失敗した場合、エラーをスローする', async () => {
      const teamId = 'team-1';
      const exAppId = 'app-1';
      const apiKey = 'new-api-key';

      const resourceNotFoundError = new Error('Secret not found');
      resourceNotFoundError.name = 'ResourceNotFoundException';

      secretsManagerMock
        .on(GetSecretValueCommand)
        .rejects(resourceNotFoundError)
        .on(CreateSecretCommand)
        .rejects(new Error('Create failed'));

      await expect(setApiKey(teamId, exAppId, apiKey)).rejects.toThrow(
        'Create failed',
      );
    });
  });

  describe('deleteApiKey', () => {
    test('新しい命名規則のSecretを削除できる', async () => {
      const teamId = 'team-1';
      const exAppId = 'app-1';
      const appEnv = 'dev';

      secretsManagerMock.on(DeleteSecretCommand).resolves({});

      await deleteApiKey(teamId, exAppId, appEnv);

      // Delete 1回のみ（Get なし）
      expect(secretsManagerMock.calls()).toHaveLength(1);
    });

    test('新しい命名規則で見つからない場合、旧命名規則を削除する', async () => {
      const teamId = 'team-1';
      const exAppId = 'app-1';
      const appEnv = 'dev';

      const resourceNotFoundError = new Error('Secret not found');
      resourceNotFoundError.name = 'ResourceNotFoundException';

      secretsManagerMock
        .on(DeleteSecretCommand, { SecretId: `${appEnv}/${teamId}/${exAppId}` })
        .rejects(resourceNotFoundError)
        .on(DeleteSecretCommand, { SecretId: `${teamId}/${exAppId}` })
        .resolves({});

      await deleteApiKey(teamId, exAppId, appEnv);

      // Delete 2回（新 → 旧）
      expect(secretsManagerMock.calls()).toHaveLength(2);
    });

    test('両方の命名規則で見つからない場合、エラーをスローする', async () => {
      const teamId = 'team-1';
      const exAppId = 'app-1';
      const appEnv = 'dev';

      const resourceNotFoundError = new Error('Secret not found');
      resourceNotFoundError.name = 'ResourceNotFoundException';

      secretsManagerMock.on(DeleteSecretCommand).rejects(resourceNotFoundError);

      await expect(deleteApiKey(teamId, exAppId, appEnv)).rejects.toThrow(
        `削除対象のAPIキーが見つかりません: ${teamId}/${exAppId}`,
      );
    });
  });
});
