import {
  CreateSecretCommand,
  DeleteSecretCommand,
  GetSecretValueCommand,
  PutSecretValueCommand,
  SecretsManagerClient,
} from '@aws-sdk/client-secrets-manager';

const client = new SecretsManagerClient();

const getSecretId = (appEnv: string, teamId: string, exAppId: string): string => {
  return appEnv ? `${appEnv}/${teamId}/${exAppId}` : `${teamId}/${exAppId}`;
};

const getLegacySecretId = (teamId: string, exAppId: string): string => {
  return `${teamId}/${exAppId}`;
};

const isResourceNotFound = (error: unknown): boolean =>
  error instanceof Error && error.name === 'ResourceNotFoundException';

const getSecretValue = async (secretId: string): Promise<string | undefined> => {
  try {
    const response = await client.send(new GetSecretValueCommand({ SecretId: secretId }));
    return response.SecretString;
  } catch (error: unknown) {
    if (isResourceNotFound(error)) return undefined;
    throw error;
  }
};

export const getApiKeyValue = async (
  teamId: string,
  exAppId: string,
  appEnv: string = '',
): Promise<string | undefined> => {
  try {
    const newSecretId = getSecretId(appEnv, teamId, exAppId);
    const value = await getSecretValue(newSecretId);
    if (value) {
      return value;
    }

    // マイグレーション対応: 新しい命名規則で見つからない場合、古い命名規則で再試行
    if (appEnv) {
      return await getSecretValue(getLegacySecretId(teamId, exAppId));
    }

    return undefined;
  } catch (error: unknown) {
    console.warn(`APIキーの取得に失敗: ${teamId}/${exAppId}`, error);
    return undefined;
  }
};

const deleteLegacySecretIfExists = async (teamId: string, exAppId: string): Promise<void> => {
  const legacySecretId = getLegacySecretId(teamId, exAppId);
  try {
    await client.send(new DeleteSecretCommand({ SecretId: legacySecretId }));
  } catch (error: unknown) {
    if (!isResourceNotFound(error)) {
      console.warn(`レガシーSecretの削除に失敗: ${legacySecretId}`, error);
    }
  }
};

const secretExists = async (secretId: string): Promise<boolean> => {
  try {
    await client.send(new GetSecretValueCommand({ SecretId: secretId }));
    return true;
  } catch (error: unknown) {
    if (isResourceNotFound(error)) return false;
    throw error;
  }
};

export const setApiKey = async (
  teamId: string,
  exAppId: string,
  apiKey: string,
  appEnv: string = '',
): Promise<void> => {
  const newSecretId = getSecretId(appEnv, teamId, exAppId);

  if (await secretExists(newSecretId)) {
    await client.send(new PutSecretValueCommand({ SecretId: newSecretId, SecretString: apiKey }));
    return;
  }

  await client.send(
    new CreateSecretCommand({
      Name: newSecretId,
      SecretString: apiKey,
      Tags: [{ Key: 'AccessProject', Value: 'GenUExApp' }],
    }),
  );

  // マイグレーション: 古い命名規則のSecretがあれば削除
  if (appEnv) {
    await deleteLegacySecretIfExists(teamId, exAppId);
  }
};

const tryDeleteSecret = async (secretId: string): Promise<boolean> => {
  try {
    await client.send(new DeleteSecretCommand({ SecretId: secretId }));
    return true;
  } catch (error: unknown) {
    if (isResourceNotFound(error)) return false;
    throw error;
  }
};

export const deleteApiKey = async (
  teamId: string,
  exAppId: string,
  appEnv: string = '',
): Promise<void> => {
  const newSecretId = getSecretId(appEnv, teamId, exAppId);
  if (await tryDeleteSecret(newSecretId)) {
    return;
  }

  const legacySecretId = getLegacySecretId(teamId, exAppId);
  if (await tryDeleteSecret(legacySecretId)) {
    return;
  }

  throw new Error(`削除対象のAPIキーが見つかりません: ${teamId}/${exAppId}`);
};
