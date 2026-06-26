import { RemovalPolicy, Stack } from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as kms from 'aws-cdk-lib/aws-kms';
import { Construct } from 'constructs';

export interface EncryptionKeyProps {
  appEnv: string;
}

export class EncryptionKey extends Construct {
  public readonly key: kms.Key;

  constructor(scope: Construct, id: string, props: EncryptionKeyProps) {
    super(scope, id);

    const account = Stack.of(this).account;
    const region = Stack.of(this).region;

    this.key = new kms.Key(this, 'EncryptionKey', {
      // 自動キーローテーションを有効化（1年間隔）
      // AWSが自動的に新しい暗号化マテリアルを生成し、古いバージョンは保持される
      enableKeyRotation: true,
      alias: `genai-web-encryption-${props.appEnv}`,
      description: `Customer managed key for GenAI Web application (${props.appEnv})`,
      removalPolicy: RemovalPolicy.RETAIN, // 重要データのため保持
      policy: new iam.PolicyDocument({
        statements: [
          // 1. アカウント管理者権限
          new iam.PolicyStatement({
            sid: 'Enable IAM User Permissions',
            effect: iam.Effect.ALLOW,
            principals: [new iam.AccountRootPrincipal()],
            actions: ['kms:*'],
            resources: ['*'],
          }),

          // 2. CloudWatch Logs サービス権限
          new iam.PolicyStatement({
            sid: 'Allow CloudWatch Logs',
            effect: iam.Effect.ALLOW,
            principals: [new iam.ServicePrincipal(`logs.${region}.amazonaws.com`)],
            actions: [
              'kms:Encrypt',
              'kms:Decrypt',
              'kms:ReEncrypt*',
              'kms:GenerateDataKey*',
              'kms:DescribeKey',
            ],
            resources: ['*'],
            conditions: {
              ArnLike: {
                'kms:EncryptionContext:aws:logs:arn': `arn:aws:logs:${region}:${account}:*`,
              },
              StringEquals: {
                'aws:SourceAccount': account,
              },
            },
          }),

          // 2.1. CloudWatch Logs から S3 へのエクスポート権限
          // CreateExportTask で KMS 暗号化済み S3 バケットに書き込む際、
          // CloudWatch Logs サービスが kms:GenerateDataKey を直接呼び出す。
          // このとき暗号化コンテキストは S3 用になるため、上記の aws:logs:arn 条件付き
          // ステートメントでは機能しない。aws:SourceAccount のみで制限する。
          // 参考: https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/S3ExportTasksConsole.html
          new iam.PolicyStatement({
            sid: 'Allow CloudWatch Logs S3 Export',
            effect: iam.Effect.ALLOW,
            principals: [new iam.ServicePrincipal(`logs.${region}.amazonaws.com`)],
            actions: ['kms:GenerateDataKey', 'kms:Decrypt'],
            resources: ['*'],
            conditions: {
              StringEquals: {
                'aws:SourceAccount': account,
              },
            },
          }),

          // 3. S3 サービス権限
          new iam.PolicyStatement({
            sid: 'Allow S3 Service',
            effect: iam.Effect.ALLOW,
            principals: [new iam.ServicePrincipal('s3.amazonaws.com')],
            actions: ['kms:Decrypt', 'kms:GenerateDataKey'],
            resources: ['*'],
            conditions: {
              StringEquals: {
                'aws:SourceAccount': account,
              },
            },
          }),

          // 4. SQS サービス権限
          new iam.PolicyStatement({
            sid: 'Allow SQS Service',
            effect: iam.Effect.ALLOW,
            principals: [new iam.ServicePrincipal('sqs.amazonaws.com')],
            actions: ['kms:Decrypt', 'kms:GenerateDataKey'],
            resources: ['*'],
            conditions: {
              StringEquals: {
                'aws:SourceAccount': account,
              },
            },
          }),

          // 5. SNS サービス権限
          new iam.PolicyStatement({
            sid: 'Allow SNS Service',
            effect: iam.Effect.ALLOW,
            principals: [new iam.ServicePrincipal('sns.amazonaws.com')],
            actions: ['kms:Decrypt', 'kms:GenerateDataKey'],
            resources: ['*'],
            conditions: {
              StringEquals: {
                'aws:SourceAccount': account,
              },
            },
          }),

          // 6. Cognito サービス権限（カスタムメール送信Lambda用）
          new iam.PolicyStatement({
            sid: 'Allow Cognito Service',
            effect: iam.Effect.ALLOW,
            principals: [new iam.ServicePrincipal('cognito-idp.amazonaws.com')],
            actions: ['kms:Decrypt', 'kms:GenerateDataKey', 'kms:DescribeKey'],
            resources: ['*'],
            conditions: {
              StringEquals: {
                'aws:SourceAccount': account,
              },
            },
          }),

          // 7. CloudFront OAC（Origin Access Control）S3オリジンアクセス用
          // CloudFrontがOACでSSE-KMS暗号化S3バケットにアクセスするために必要
          new iam.PolicyStatement({
            sid: 'Allow CloudFront Service',
            effect: iam.Effect.ALLOW,
            principals: [new iam.ServicePrincipal('cloudfront.amazonaws.com')],
            actions: ['kms:Decrypt', 'kms:Encrypt', 'kms:GenerateDataKey*'],
            resources: ['*'],
            conditions: {
              StringEquals: {
                'aws:SourceAccount': account,
              },
            },
          }),

          // 8. CloudFront 標準ログ（legacy）配信用
          // delivery.logs.amazonaws.com がSSE-KMS暗号化S3バケットにログを書き込むために必要
          // 参考: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/standard-logging-legacy-s3.html
          new iam.PolicyStatement({
            sid: 'Allow CloudFront Log Delivery',
            effect: iam.Effect.ALLOW,
            principals: [new iam.ServicePrincipal('delivery.logs.amazonaws.com')],
            actions: ['kms:GenerateDataKey*'],
            resources: ['*'],
            conditions: {
              StringEquals: {
                'aws:SourceAccount': account,
              },
            },
          }),

          // 注: DynamoDBサービスプリンシパルは不要
          // DynamoDBはサービス主体モデル（DynamoDBサービスが代理でKMSを呼ぶ）で動作し、
          // テーブルにアクセスするプリンシパル（Lambda実行ロール等）のIAM権限を使用して
          // KMSキーにアクセスする。DynamoDBサービスプリンシパルをキーポリシーに追加する必要はない。
        ],
      }),
    });
  }

  /**
   * Lambda実行ロールにKMSキー使用権限を付与
   * このメソッドは各Lambda関数作成後に呼び出す必要がある
   */
  grantToLambda(lambdaRole: iam.IRole): void {
    this.key.grant(
      lambdaRole,
      'kms:Decrypt',
      'kms:Encrypt',
      'kms:GenerateDataKey',
      'kms:DescribeKey',
    );
  }
}

export interface UserIdentifierHmacKeyProps {
  appEnv: string;
}

/**
 * Cognito subから安定IDを生成するためのHMACキー
 *
 * セキュリティ仕様:
 * - KeySpec: HMAC_256 (SHA-256ベースのHMAC)
 * - KeyUsage: GENERATE_VERIFY_MAC (MAC生成・検証専用)
 * - 自動ローテーション: 無効（HMACキーは非対応）
 * - RemovalPolicy: RETAIN（誤削除防止）
 */
export class UserIdentifierHmacKey extends Construct {
  public readonly key: kms.Key;

  constructor(scope: Construct, id: string, props: UserIdentifierHmacKeyProps) {
    super(scope, id);

    const account = Stack.of(this).account;

    this.key = new kms.Key(this, 'UserIdentifierHmacKey', {
      keySpec: kms.KeySpec.HMAC_256,
      keyUsage: kms.KeyUsage.GENERATE_VERIFY_MAC,

      // HMACキーは自動ローテーション非対応
      enableKeyRotation: false,

      alias: `genai-web-user-hmac-${props.appEnv}`,
      description: `HMAC key for generating stable pseudonymous user identifiers (${props.appEnv})`,

      // 誤削除防止のため保持
      removalPolicy: RemovalPolicy.RETAIN,

      policy: new iam.PolicyDocument({
        statements: [
          // アカウント管理者権限
          new iam.PolicyStatement({
            sid: 'Enable IAM User Permissions',
            effect: iam.Effect.ALLOW,
            principals: [new iam.AccountRootPrincipal()],
            actions: ['kms:*'],
            resources: ['*'],
          }),
        ],
      }),
    });
  }

  /**
   * Lambda実行ロールにHMAC生成権限を付与
   */
  grantGenerateMac(lambdaRole: iam.IRole): void {
    this.key.grant(lambdaRole, 'kms:GenerateMac', 'kms:DescribeKey');
  }
}
