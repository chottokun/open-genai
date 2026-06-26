import { Duration, Fn, Stack } from 'aws-cdk-lib';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import {
  CfnIdentityPool,
  CfnIdentityPoolRoleAttachment,
  CfnLogDeliveryConfiguration,
  FeaturePlan,
  StandardThreatProtectionMode,
  UserPool,
  UserPoolClient,
  UserPoolOperation,
} from 'aws-cdk-lib/aws-cognito';
import { RoleMappingMatchType } from 'aws-cdk-lib/aws-cognito-identitypool';
import { Effect, FederatedPrincipal, PolicyStatement, Role } from 'aws-cdk-lib/aws-iam';
import * as kms from 'aws-cdk-lib/aws-kms';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { LogGroup } from 'aws-cdk-lib/aws-logs';
import * as ses from 'aws-cdk-lib/aws-ses';
import { Construct } from 'constructs';

export interface AuthProps {
  encryptionKey: kms.IKey;
  selfSignUpEnabled: boolean;
  allowedIpV4AddressRanges: string[] | null;
  allowedIpV6AddressRanges: string[] | null;
  allowedSignUpEmailDomains: string[] | null;
  samlAuthEnabled: boolean;
  samlOAuthCallbackUrls?: string[];
  samlIdentityProviderNames?: string[];
  customEmailSender: {
    sesIdentityName: string;
    fromAddress: string;
    sesConfigurationSetName?: string;
  } | null;
  emailMfaRequired: boolean;
  reauthenticationIntervalDays: number;
  appEnv: string;
}

// Auth Constructでは、Team管理機能で付与されたCognitoのグループごとにユーザに付与するロールを変更したいため、
// alpha版のConstructからL1 Constructに変更している

export class Auth extends Construct {
  readonly userPool: UserPool;
  readonly client: UserPoolClient;
  readonly idPool: CfnIdentityPool;
  readonly authenticatedRole: Role;
  readonly unauthenticatedRole: Role;
  readonly systemAdminRole: Role;
  readonly teamAdminRole: Role;
  readonly userRole: Role;
  readonly cognitoLogGroupName: string;
  readonly customEmailSenderLambdaRoleArn: string | undefined;
  readonly sesTenantName: string | undefined;

  constructor(scope: Construct, id: string, props: AuthProps) {
    super(scope, id);

    const userPool = new UserPool(this, 'UserPool', {
      // SAML 認証を有効化する場合、UserPool を利用したセルフサインアップは利用しない。セキュリティを意識して閉じる。
      selfSignUpEnabled: props.samlAuthEnabled ? false : props.selfSignUpEnabled,
      signInAliases: {
        username: false,
        email: true,
      },
      passwordPolicy: {
        requireUppercase: true,
        requireSymbols: true,
        requireDigits: true,
        minLength: 8,
      },
      autoVerify: { email: true },
      // Custom Email Sender Lambda 利用時は、Cognito がコードを暗号化するための KMS キーを設定
      ...(props.customEmailSender ? { customSenderKmsKey: props.encryptionKey } : {}),
      // Email MFA 有効時は SES 構成が必須（CDK バリデーション要件）
      // customEmailSender が設定されている場合、SES Identity のドメインを使用
      ...(props.customEmailSender && props.emailMfaRequired
        ? {
            email: cognito.UserPoolEmail.withSES({
              fromEmail: props.customEmailSender.fromAddress,
              sesVerifiedDomain: props.customEmailSender.sesIdentityName,
            }),
          }
        : {}),
      // Email MFA: emailMfaRequired が true の場合、Email MFA を必須化
      // SAML/フェデレーテッドユーザーには MFA REQUIRED は適用されない（AWS仕様）
      ...(props.emailMfaRequired
        ? {
            mfa: cognito.Mfa.REQUIRED,
            mfaSecondFactor: { sms: false, otp: false, email: true },
          }
        : {}),
      featurePlan: FeaturePlan.PLUS,
      standardThreatProtectionMode: StandardThreatProtectionMode.FULL_FUNCTION,
    });

    // ログの設定
    const cognitoLogGroup = new LogGroup(this, 'CognitoActivityLogGroup', {
      encryptionKey: props.encryptionKey,
    });
    new CfnLogDeliveryConfiguration(this, 'CognitoLogDelivery', {
      userPoolId: userPool.userPoolId,

      logConfigurations: [
        {
          eventSource: 'userAuthEvents',
          logLevel: 'INFO',
          cloudWatchLogsConfiguration: {
            logGroupArn: Fn.select(0, Fn.split(':*', cognitoLogGroup.logGroupArn)), // the L2 LogGroup construct appends :* to the logGroupArn
          },
        },
        {
          eventSource: 'userNotification',
          logLevel: 'ERROR',
          cloudWatchLogsConfiguration: {
            logGroupArn: Fn.select(0, Fn.split(':*', cognitoLogGroup.logGroupArn)), // the L2 LogGroup construct appends :* to the logGroupArn
          },
        },
      ],
    });

    const samlOAuthConfig =
      props.samlAuthEnabled &&
      props.samlOAuthCallbackUrls?.length &&
      props.samlIdentityProviderNames?.length
        ? {
            oAuth: {
              flows: {
                authorizationCodeGrant: true,
                implicitCodeGrant: true,
              },
              scopes: [
                cognito.OAuthScope.PROFILE,
                cognito.OAuthScope.PHONE,
                cognito.OAuthScope.EMAIL,
                cognito.OAuthScope.OPENID,
                cognito.OAuthScope.COGNITO_ADMIN,
              ],
              callbackUrls: props.samlOAuthCallbackUrls,
              logoutUrls: props.samlOAuthCallbackUrls?.map((url) => `${url}/signed-out`),
            },
            supportedIdentityProviders: props.samlIdentityProviderNames.map((name) =>
              cognito.UserPoolClientIdentityProvider.custom(name),
            ),
          }
        : {};

    const client = userPool.addClient('client', {
      idTokenValidity: Duration.days(1),
      refreshTokenValidity: Duration.days(props.reauthenticationIntervalDays),
      ...samlOAuthConfig,
    });

    const idPool = new CfnIdentityPool(this, 'IdentityPool', {
      allowUnauthenticatedIdentities: false,
      cognitoIdentityProviders: [
        {
          clientId: client.userPoolClientId,
          providerName: userPool.userPoolProviderName,
        },
      ],
    });
    const authenticatedRole = new Role(this, 'AuthenticatedRole', {
      assumedBy: new FederatedPrincipal(
        'cognito-identity.amazonaws.com',
        {
          StringEquals: {
            'cognito-identity.amazonaws.com:aud': idPool.ref,
          },
          'ForAnyValue:StringLike': {
            'cognito-identity.amazonaws.com:amr': 'authenticated',
          },
        },
        'sts:AssumeRoleWithWebIdentity',
      ),
    });
    this.authenticatedRole = authenticatedRole;
    const unauthenticatedRole = new Role(this, 'UnauthenticatedRole', {
      assumedBy: new FederatedPrincipal(
        'cognito-identity.amazonaws.com',
        {
          StringEquals: {
            'cognito-identity.amazonaws.com:aud': idPool.ref,
          },
          'ForAnyValue:StringLike': {
            'cognito-identity.amazonaws.com:amr': 'authenticated',
          },
        },
        'sts:AssumeRoleWithWebIdentity',
      ),
    });
    this.unauthenticatedRole = unauthenticatedRole;

    /** Added by Prototyping */
    const commonRoleProps = {
      assumedBy: new FederatedPrincipal(
        'cognito-identity.amazonaws.com',
        {
          StringEquals: {
            'cognito-identity.amazonaws.com:aud': idPool.attrId,
          },
          'ForAnyValue:StringLike': {
            'cognito-identity.amazonaws.com:amr': 'authenticated',
          },
        },
        'sts:AssumeRoleWithWebIdentity',
      ),
    };
    this.systemAdminRole = new Role(this, 'SystemAdminRole', commonRoleProps);
    this.systemAdminRole.addToPolicy(
      new PolicyStatement({
        actions: ['transcribe:StartStreamTranscriptionWebSocket'],
        resources: ['*'],
      }),
    );

    this.teamAdminRole = new Role(this, 'TeamAdminRole', commonRoleProps);
    this.teamAdminRole.addToPolicy(
      new PolicyStatement({
        actions: ['transcribe:StartStreamTranscriptionWebSocket'],
        resources: ['*'],
      }),
    );

    this.userRole = new Role(this, 'UserRole', commonRoleProps);
    this.userRole.addToPolicy(
      new PolicyStatement({
        actions: ['transcribe:StartStreamTranscriptionWebSocket'],
        resources: ['*'],
      }),
    );

    const cfnIdentityPoolRoleAttachment = new CfnIdentityPoolRoleAttachment(
      this,
      'IdentityPoolRoleAttachment',
      {
        identityPoolId: idPool.attrId,
        roleMappings: {
          mapping: {
            type: 'Rules',
            identityProvider: `cognito-idp.${userPool.stack.region}.amazonaws.com/${userPool.userPoolId}:${client.userPoolClientId}`,
            ambiguousRoleResolution: 'AuthenticatedRole',
            rulesConfiguration: {
              rules: [
                {
                  claim: 'cognito:groups',
                  value: 'SystemAdminGroup',
                  roleArn: this.systemAdminRole.roleArn,
                  matchType: RoleMappingMatchType.CONTAINS,
                },
                {
                  claim: 'cognito:groups',
                  value: 'TeamAdminGroup',
                  roleArn: this.teamAdminRole.roleArn,
                  matchType: RoleMappingMatchType.CONTAINS,
                },
                {
                  claim: 'cognito:groups',
                  value: 'UserGroup',
                  roleArn: this.userRole.roleArn,
                  matchType: RoleMappingMatchType.CONTAINS,
                },
              ],
            },
          },
        },
        roles: {
          authenticated: authenticatedRole.roleArn,
          unauthenticated: unauthenticatedRole.roleArn,
        },
      },
    );
    cfnIdentityPoolRoleAttachment.addDependency(idPool);

    userPool.addGroup('SystemAdminGroup', {
      groupName: 'SystemAdminGroup',
      precedence: 1,
    });

    userPool.addGroup('TeamAdminGroup', {
      groupName: 'TeamAdminGroup',
      precedence: 2,
    });

    userPool.addGroup('UserGroup', {
      groupName: 'UserGroup',
      precedence: 3,
    });
    /** End */

    if (props.allowedIpV4AddressRanges || props.allowedIpV6AddressRanges) {
      const ipRanges = [
        ...(props.allowedIpV4AddressRanges ? props.allowedIpV4AddressRanges : []),
        ...(props.allowedIpV6AddressRanges ? props.allowedIpV6AddressRanges : []),
      ];

      authenticatedRole.addToPolicy(
        new PolicyStatement({
          effect: Effect.DENY,
          resources: ['*'],
          actions: ['*'],
          conditions: {
            NotIpAddress: {
              'aws:SourceIp': ipRanges,
            },
          },
        }),
      );
    }

    // Lambda
    if (props.allowedSignUpEmailDomains) {
      const checkEmailDomainFunction = new NodejsFunction(this, 'CheckEmailDomain', {
        runtime: Runtime.NODEJS_22_X,
        entry: './lambda/checkEmailDomain.ts',
        timeout: Duration.minutes(15),
        environment: {
          ALLOWED_SIGN_UP_EMAIL_DOMAINS_STR: JSON.stringify(props.allowedSignUpEmailDomains),
        },
      });

      userPool.addTrigger(UserPoolOperation.PRE_SIGN_UP, checkEmailDomainFunction);
    }

    const assignUserToDefaultGroupFunction = new NodejsFunction(this, 'AddTeamUserToUserGroup', {
      runtime: Runtime.NODEJS_22_X,
      entry: './lambda/assignUserToDefaultGroupOnSignUp.ts',
      timeout: Duration.minutes(15),
    });
    assignUserToDefaultGroupFunction.addToRolePolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['cognito-idp:AdminAddUserToGroup', 'cognito-idp:ListUsers'],
        resources: ['*'],
      }),
    );
    userPool.node.addDependency(assignUserToDefaultGroupFunction);

    userPool.addTrigger(UserPoolOperation.POST_CONFIRMATION, assignUserToDefaultGroupFunction);

    // Custom Email Sender Lambda (同一アカウント SES + Tenant によるメール送信)
    if (props.customEmailSender) {
      // SES Tenant 作成（レピュテーション分離用）
      const tenantName = props.appEnv;
      const tenant = new ses.CfnTenant(this, 'EmailTenant', {
        tenantName: tenantName,
        resourceAssociations: [
          {
            resourceArn: `arn:aws:ses:${Stack.of(this).region}:${Stack.of(this).account}:identity/${props.customEmailSender.sesIdentityName}`,
          },
          ...(props.customEmailSender.sesConfigurationSetName
            ? [
                {
                  resourceArn: `arn:aws:ses:${Stack.of(this).region}:${Stack.of(this).account}:configuration-set/${props.customEmailSender.sesConfigurationSetName}`,
                },
              ]
            : []),
        ],
      });
      this.sesTenantName = tenantName;

      const customEmailSenderFunction = new NodejsFunction(this, 'CustomEmailSender', {
        runtime: Runtime.NODEJS_22_X,
        entry: './lambda/customEmailSender.ts',
        timeout: Duration.minutes(15),
        environment: {
          KMS_KEY_ARN: props.encryptionKey.keyArn,
          SES_FROM_ADDRESS: props.customEmailSender.fromAddress,
          SES_TENANT_NAME: tenantName,
        },
      });

      // Lambda は Tenant 作成後に実行されるべき
      customEmailSenderFunction.node.addDependency(tenant);

      // IAM: KMS Decrypt 権限（Cognito が暗号化したコードの復号用）
      props.encryptionKey.grantDecrypt(customEmailSenderFunction);

      // IAM: 同一アカウントの SES への送信権限
      // 送信元の制御は identity リソースと ses:FromAddress 条件で担保する
      customEmailSenderFunction.addToRolePolicy(
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ['ses:SendEmail'],
          resources: [
            `arn:aws:ses:${Stack.of(this).region}:${Stack.of(this).account}:identity/${props.customEmailSender.sesIdentityName}`,
            ...(props.customEmailSender.sesConfigurationSetName
              ? [
                  `arn:aws:ses:${Stack.of(this).region}:${Stack.of(this).account}:configuration-set/${props.customEmailSender.sesConfigurationSetName}`,
                ]
              : []),
          ],
          conditions: {
            StringEquals: {
              'ses:FromAddress': props.customEmailSender.fromAddress,
            },
          },
        }),
      );

      userPool.addTrigger(UserPoolOperation.CUSTOM_EMAIL_SENDER, customEmailSenderFunction);

      this.customEmailSenderLambdaRoleArn = customEmailSenderFunction.role!.roleArn;
    }

    this.client = client;
    this.userPool = userPool;
    this.idPool = idPool;
    this.cognitoLogGroupName = cognitoLogGroup.logGroupName;
  }
}
