import { CloudFrontToS3, CloudFrontToS3Props } from '@aws-solutions-constructs/aws-cloudfront-s3';
import { NodejsBuild } from '@cdklabs/deploy-time-build';
import { Duration, RemovalPolicy, Stack } from 'aws-cdk-lib';
import { ICertificate } from 'aws-cdk-lib/aws-certificatemanager';
import {
  AllowedMethods,
  CfnDistribution,
  Function as CloudFrontFunction,
  Distribution,
  FunctionCode,
  FunctionEventType,
  FunctionRuntime,
  HeadersFrameOption,
  HeadersReferrerPolicy,
  ResponseHeadersPolicy,
  SecurityPolicyProtocol,
  ViewerProtocolPolicy,
} from 'aws-cdk-lib/aws-cloudfront';
import { S3BucketOrigin } from 'aws-cdk-lib/aws-cloudfront-origins';
import * as kms from 'aws-cdk-lib/aws-kms';
import { ARecord, HostedZone, RecordTarget } from 'aws-cdk-lib/aws-route53';
import { CloudFrontTarget } from 'aws-cdk-lib/aws-route53-targets';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import { HiddenUseCases } from 'genai-web';
import { z } from 'zod';
import { govaiForHomepage } from '../stack-input';

export interface WebProps {
  encryptionKey: kms.IKey;
  appEnv: string;
  apiEndpointUrl: string;
  teamAccessControlApiEndpointUrl: string;
  userPoolId: string;
  userPoolClientId: string;
  idPoolId: string;
  predictStreamFunctionArn: string;
  selfSignUpEnabled: boolean;
  webAclId?: string;
  modelRegion: string;
  modelIds: string[];
  imageGenerationModelIds: string[];
  endpointNames: string[];
  samlAuthEnabled: boolean;
  samlCognitoDomainName?: string | null;
  samlCognitoFederatedIdentityPrimaryProviderName?: string | null;
  samlCognitoFederatedIdentityAdditionalProviderNames?:
    | { providerName: string; signinPath: string }[]
    | null;
  cert?: ICertificate;
  hostName?: string | null;
  domainName?: string | null;
  hostedZoneId?: string | null;
  hiddenUseCases: HiddenUseCases;
  govais_for_homepage: z.infer<typeof govaiForHomepage>[];
  topChatSystemPrompt: string;
  topChatSystemPromptTitle: string;
  maintenance: boolean;
}

export class Web extends Construct {
  public readonly distribution: Distribution;

  constructor(scope: Construct, id: string, props: WebProps) {
    super(scope, id);

    const commonSecurityHeaders = {
      frameOptions: {
        frameOption: HeadersFrameOption.DENY,
        override: true,
      },
      strictTransportSecurity: {
        accessControlMaxAge: Duration.days(365 * 2),
        includeSubdomains: true,
        preload: true,
        override: true,
      },
      xssProtection: {
        protection: true,
        modeBlock: true,
        override: true,
      },
      contentTypeOptions: {
        override: true,
      },
      referrerPolicy: {
        referrerPolicy: HeadersReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN,
        override: true,
      },
    };

    const appCsp =
      "default-src 'self'; script-src 'self' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob: https:; connect-src 'self' https://*.amazonaws.com wss://*.amazonaws.com https://*.amazoncognito.com; font-src 'self' https://fonts.gstatic.com data:; object-src 'none'; frame-ancestors 'none';";

    const forbidden403Csp =
      "default-src 'none'; style-src https://fonts.googleapis.com; font-src https://fonts.gstatic.com; frame-ancestors 'none';";

    const responseHeadersPolicy = new ResponseHeadersPolicy(this, 'SecurityHeadersPolicy', {
      securityHeadersBehavior: {
        contentSecurityPolicy: {
          contentSecurityPolicy: appCsp,
          override: true,
        },
        ...commonSecurityHeaders,
      },
    });

    const indexHtmlResponseHeadersPolicy = new ResponseHeadersPolicy(
      this,
      'IndexHtmlHeadersPolicy',
      {
        securityHeadersBehavior: {
          contentSecurityPolicy: {
            contentSecurityPolicy: appCsp,
            override: true,
          },
          ...commonSecurityHeaders,
        },
        customHeadersBehavior: {
          customHeaders: [
            {
              header: 'Cache-Control',
              value: 'no-store',
              override: true,
            },
          ],
        },
      },
    );

    const forbiddenHtmlResponseHeadersPolicy = new ResponseHeadersPolicy(
      this,
      'ForbiddenHtmlHeadersPolicy',
      {
        securityHeadersBehavior: {
          contentSecurityPolicy: {
            contentSecurityPolicy: forbidden403Csp,
            override: true,
          },
          ...commonSecurityHeaders,
        },
        customHeadersBehavior: {
          customHeaders: [
            {
              header: 'Cache-Control',
              value: 'no-store',
              override: true,
            },
          ],
        },
      },
    );

    // Maintenance Mode: CloudFront Function で全リクエストを maintenance.html にリライト
    const maintenanceFunctionAssociations = props.maintenance
      ? [
          {
            function: new CloudFrontFunction(this, 'MaintenanceFunction', {
              functionName: `maintenance-redirect${props.appEnv ? `-${props.appEnv}` : ''}`,
              runtime: FunctionRuntime.JS_2_0,
              code: FunctionCode.fromInline(`
function handler(event) {
  var request = event.request;
  if (request.uri !== '/maintenance.html') {
    request.uri = '/maintenance.html';
  }
  return request;
}
`),
            }),
            eventType: FunctionEventType.VIEWER_REQUEST,
          },
        ]
      : [];

    const commonBucketProps: s3.BucketProps = {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.KMS,
      encryptionKey: props.encryptionKey,
      autoDeleteObjects: true,
      removalPolicy: RemovalPolicy.DESTROY,
      objectOwnership: s3.ObjectOwnership.OBJECT_WRITER,
      enforceSSL: true,
    };

    const cloudFrontToS3Props: CloudFrontToS3Props = {
      insertHttpSecurityHeaders: false,
      loggingBucketProps: commonBucketProps,
      bucketProps: commonBucketProps,
      cloudFrontLoggingBucketProps: commonBucketProps,
      cloudFrontLoggingBucketAccessLogBucketProps: commonBucketProps,
      cloudFrontDistributionProps: {
        minimumProtocolVersion: SecurityPolicyProtocol.TLS_V1_2_2021,
        defaultBehavior: {
          responseHeadersPolicy: responseHeadersPolicy,
          functionAssociations: maintenanceFunctionAssociations,
        },
        errorResponses: [
          {
            httpStatus: 403,
            responseHttpStatus: 200,
            responsePagePath: '/403.html',
          },
          {
            httpStatus: 404,
            responseHttpStatus: 200,
            responsePagePath: '/index.html',
          },
        ],
        defaultRootObject: 'index.html',
      },
    };

    if (props.cert) {
      cloudFrontToS3Props.cloudFrontDistributionProps.certificate = props.cert;
    }

    if (props.hostName && props.domainName) {
      cloudFrontToS3Props.cloudFrontDistributionProps.domainNames = [
        `${props.hostName}.${props.domainName}`,
      ];
    }

    const { cloudFrontWebDistribution, s3BucketInterface } = new CloudFrontToS3(
      this,
      'Web',
      cloudFrontToS3Props,
    );
    const bucket = s3.Bucket.fromBucketArn(this, 'WebBucket', s3BucketInterface.bucketArn);

    // addBehavior の呼び出し順で CacheBehaviors の配列インデックスが決まるため、
    // ラッパーで pathPattern → index のマッピングを記録する
    const behaviorIndexMap = new Map<string, number>();
    let nextBehaviorIndex = 0;
    const addTrackedBehavior: typeof cloudFrontWebDistribution.addBehavior = (
      pathPattern,
      origin,
      behaviorOptions,
    ) => {
      cloudFrontWebDistribution.addBehavior(pathPattern, origin, behaviorOptions);
      behaviorIndexMap.set(pathPattern, nextBehaviorIndex++);
    };

    addTrackedBehavior('/index.html', S3BucketOrigin.withOriginAccessControl(bucket), {
      responseHeadersPolicy: indexHtmlResponseHeadersPolicy,
      allowedMethods: AllowedMethods.ALLOW_GET_HEAD,
      viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      functionAssociations: maintenanceFunctionAssociations,
    });

    addTrackedBehavior('/403.html', S3BucketOrigin.withOriginAccessControl(bucket), {
      responseHeadersPolicy: forbiddenHtmlResponseHeadersPolicy,
      allowedMethods: AllowedMethods.ALLOW_GET_HEAD,
      viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      functionAssociations: maintenanceFunctionAssociations,
    });

    // これはRoute53で管理していればの話
    if (props.hostName && props.domainName && props.hostedZoneId) {
      // DNS record for custom domain
      const hostedZone = HostedZone.fromHostedZoneAttributes(this, 'HostedZone', {
        hostedZoneId: props.hostedZoneId,
        zoneName: props.domainName,
      });

      new ARecord(this, 'ARecord', {
        zone: hostedZone,
        recordName: props.hostName,
        target: RecordTarget.fromAlias(new CloudFrontTarget(cloudFrontWebDistribution)),
      });
    }

    if (props.webAclId) {
      const existingCloudFrontWebDistribution = cloudFrontWebDistribution.node
        .defaultChild as CfnDistribution;
      existingCloudFrontWebDistribution.addPropertyOverride(
        'DistributionConfig.WebACLId',
        props.webAclId,
      );
    }

    new NodejsBuild(this, 'BuildWeb', {
      nodejsVersion: 22,
      assets: [
        {
          path: '../../',
          exclude: [
            '.git',
            '.github',
            '.gitignore',
            '.prettierignore',
            '.prettierrc.json',
            '*.md',
            'LICENSE',
            'docs',
            'imgs',
            'setup-env.sh',
            'node_modules',
            'prompt-templates',
            'packages/cdk/**/*',
            '!packages/cdk/cdk.json',
            'packages/web/dist',
            'packages/web/dev-dist',
            'packages/web/node_modules',
          ],
        },
      ],
      destinationBucket: s3BucketInterface,
      distribution: cloudFrontWebDistribution,
      outputSourceDirectory: './packages/web/dist',
      buildCommands: [
        'npm ci',
        'npm run web:build',
        'cp ./packages/web/403.html ./packages/web/dist/',
        'cp ./packages/web/maintenance.html ./packages/web/dist/',
      ],
      buildEnvironment: {
        NODE_OPTIONS: '--max-old-space-size=2048', // デプロイ時のCodeBuildのメモリを設定
        VITE_APP_ENV: props.appEnv,
        VITE_APP_API_ENDPOINT: props.apiEndpointUrl,
        VITE_APP_TEAM_ACCESS_CONTROL_API_ENDPOINT: props.teamAccessControlApiEndpointUrl,
        VITE_APP_REGION: Stack.of(this).region,
        VITE_APP_USER_POOL_ID: props.userPoolId,
        VITE_APP_USER_POOL_CLIENT_ID: props.userPoolClientId,
        VITE_APP_IDENTITY_POOL_ID: props.idPoolId,
        VITE_APP_PREDICT_STREAM_FUNCTION_ARN: props.predictStreamFunctionArn,
        VITE_APP_SELF_SIGN_UP_ENABLED: props.selfSignUpEnabled.toString(),
        VITE_APP_MODEL_REGION: props.modelRegion,
        VITE_APP_MODEL_IDS: JSON.stringify(props.modelIds),
        VITE_APP_IMAGE_MODEL_IDS: JSON.stringify(props.imageGenerationModelIds),
        VITE_APP_ENDPOINT_NAMES: JSON.stringify(props.endpointNames),
        VITE_APP_SAMLAUTH_ENABLED: props.samlAuthEnabled.toString(),
        VITE_APP_SAML_COGNITO_DOMAIN_NAME: props.samlCognitoDomainName ?? '',
        VITE_APP_SAML_COGNITO_FEDERATED_IDENTITY_PRIMARY_PROVIDER_NAME:
          props.samlCognitoFederatedIdentityPrimaryProviderName ?? '',
        VITE_APP_SAML_COGNITO_FEDERATED_IDENTITY_ADDITIONAL_PROVIDER_NAMES: JSON.stringify(
          props.samlCognitoFederatedIdentityAdditionalProviderNames ?? [],
        ),
        VITE_APP_HIDDEN_USE_CASES: JSON.stringify(props.hiddenUseCases),
        VITE_APP_GOVAIS_FOR_HOMEPAGE: JSON.stringify(props.govais_for_homepage),
        VITE_APP_TOP_CHAT_SYSTEM_PROMPT: props.topChatSystemPrompt,
        VITE_APP_TOP_CHAT_SYSTEM_PROMPT_TITLE: props.topChatSystemPromptTitle,
      },
    });

    this.distribution = cloudFrontWebDistribution;
  }
}
