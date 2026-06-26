import { Logger } from '@aws-lambda-powertools/logger';
import { GenerateMacCommand, KMSClient } from '@aws-sdk/client-kms';

const logger = new Logger();
const kmsClient = new KMSClient({});

// Domain separation prefix（第二原像攻撃対策）
const DOMAIN_PREFIX = 'genai-web-user-id:';

/**
 * Cognito subからKMS HMACを使って安定したユーザーIDを生成
 *
 * セキュリティ特性:
 * - 不可逆: 安定IDからCognito subを逆算不可能
 * - 安定性: 同じCognito subからは常に同じ安定IDが生成される
 * - ドメイン分離: prefixにより他用途への悪用を防ぐ
 *
 * @param cognitoSub - Cognito User Pool の sub (UUID)
 * @returns Base64URL エンコードされた安定ID
 * @throws エラーが発生した場合
 *
 * @example
 * const stableId = await generateStableUserId('a1b2c3d4-...');
 * // => "Abc123XyZ..."
 */
export async function generateStableUserId(cognitoSub: string): Promise<string> {
  if (!cognitoSub) {
    throw new Error('cognitoSub is required');
  }

  // 環境変数から取得（テスト時の動的設定に対応）
  const HMAC_KEY_ID = process.env.USER_IDENTIFIER_HMAC_KEY_ID;

  if (!HMAC_KEY_ID) {
    throw new Error('Environment variable USER_IDENTIFIER_HMAC_KEY_ID is not set');
  }

  // Domain separation: 必ず固定prefixを付与
  const message = Buffer.from(DOMAIN_PREFIX + cognitoSub);

  try {
    const command = new GenerateMacCommand({
      KeyId: HMAC_KEY_ID,
      Message: message,
      MacAlgorithm: 'HMAC_SHA_256',
    });

    const response = await kmsClient.send(command);

    if (!response.Mac) {
      throw new Error('KMS GenerateMac failed: No MAC returned');
    }

    // Base64URL エンコード（URL safe、パディングなし）
    const stableId = Buffer.from(response.Mac)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');

    return stableId;
  } catch (error) {
    logger.error('Failed to generate stable user ID', error as Error);
    throw error;
  }
}
