import { BEDROCK_IMAGE_GEN_MODELS, BEDROCK_TEXT_MODELS } from '@genai-web/common';
import { Duration, RemovalPolicy, Stack } from 'aws-cdk-lib';
import {
  AuthorizationType,
  CognitoUserPoolsAuthorizer,
  Cors,
  LambdaIntegration,
  ResponseType,
  RestApi,
} from 'aws-cdk-lib/aws-apigateway';
import { UserPool, UserPoolClient } from 'aws-cdk-lib/aws-cognito';
import { Table } from 'aws-cdk-lib/aws-dynamodb';
import { Effect, PolicyStatement, Role } from 'aws-cdk-lib/aws-iam';
import * as kms from 'aws-cdk-lib/aws-kms';
import { IFunction, Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { BlockPublicAccess, Bucket, BucketEncryption, HttpMethods } from 'aws-cdk-lib/aws-s3';
import { NagSuppressions } from 'cdk-nag';
import { Construct } from 'constructs';

export interface BackendApiProps {
  // Encryption
  encryptionKey: kms.IKey;

  // Context Params
  modelRegion: string;
  modelIds: string[];
  imageGenerationModelIds: string[];
  endpointNames: string[];
  crossAccountBedrockRoleArn?: string | null;
  s3FileExpirationDays: number;
  dynamoDbTtlDays: number;

  // Inference Profile mappings for cost allocation tagging
  inferenceProfileMap?: { [modelId: string]: string };
  imageInferenceProfileMap?: { [modelId: string]: string };

  // Resource
  userPool: UserPool;
  authenticatedRole: Role;
  // idPool: IdentityPool;
  userPoolClient: UserPoolClient;
  table: Table;
  guardrailIdentify?: string;
  guardrailVersion?: string;
}

export class Api extends Construct {
  readonly api: RestApi;
  readonly predictStreamFunction: NodejsFunction;
  readonly modelRegion: string;
  readonly modelIds: string[];
  readonly imageGenerationModelIds: string[];
  readonly endpointNames: string[];
  readonly fileBucket: Bucket;
  /** 親スタックから cognito-identity:* の IAM を付与するため公開する */
  readonly getSignedUrlFunction: NodejsFunction;
  readonly getFileDownloadSignedUrlFunction: IFunction;
  readonly deleteFileFunction: NodejsFunction;

  constructor(scope: Construct, id: string, props: BackendApiProps) {
    super(scope, id);

    const {
      modelRegion,
      modelIds,
      imageGenerationModelIds,
      endpointNames,
      crossAccountBedrockRoleArn,
      userPool,
      userPoolClient,
      table,
      // idPool,
      authenticatedRole,
    } = props;

    // Validate Model Names
    for (const modelId of modelIds) {
      if (!BEDROCK_TEXT_MODELS.includes(modelId)) {
        throw new Error(`Unsupported Model Name: ${modelId}`);
      }
    }
    for (const modelId of imageGenerationModelIds) {
      if (!BEDROCK_IMAGE_GEN_MODELS.includes(modelId)) {
        throw new Error(`Unsupported Model Name: ${modelId}`);
      }
    }

    // S3 (File Bucket)
    const fileBucket = new Bucket(this, 'FileBucket', {
      encryption: BucketEncryption.KMS,
      encryptionKey: props.encryptionKey,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      enforceSSL: true,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      lifecycleRules: [
        {
          expiration: Duration.days(props.s3FileExpirationDays),
        },
      ],
    });
    fileBucket.addCorsRule({
      allowedOrigins: ['*'],
      allowedMethods: [HttpMethods.GET, HttpMethods.POST, HttpMethods.PUT],
      allowedHeaders: ['*'],
      exposedHeaders: [],
      maxAge: 3000,
    });

    // Lambda
    const predictFunction = new NodejsFunction(this, 'Predict', {
      runtime: Runtime.NODEJS_22_X,
      entry: './lambda/predict.ts',
      timeout: Duration.minutes(15),
      environment: {
        MODEL_REGION: modelRegion,
        MODEL_IDS: JSON.stringify(modelIds),
        IMAGE_GENERATION_MODEL_IDS: JSON.stringify(imageGenerationModelIds),
        CROSS_ACCOUNT_BEDROCK_ROLE_ARN: crossAccountBedrockRoleArn ?? '',
        ...(props.guardrailIdentify ? { GUARDRAIL_IDENTIFIER: props.guardrailIdentify } : {}),
        ...(props.guardrailVersion ? { GUARDRAIL_VERSION: props.guardrailVersion } : {}),
        ...(props.inferenceProfileMap
          ? { INFERENCE_PROFILE_MAP: JSON.stringify(props.inferenceProfileMap) }
          : {}),
      },
    });

    const predictStreamFunction = new NodejsFunction(this, 'PredictStream', {
      runtime: Runtime.NODEJS_22_X,
      entry: './lambda/predictStream.ts',
      timeout: Duration.minutes(15),
      memorySize: 256,
      environment: {
        USER_POOL_ID: userPool.userPoolId,
        USER_POOL_CLIENT_ID: userPoolClient.userPoolClientId,
        MODEL_REGION: modelRegion,
        MODEL_IDS: JSON.stringify(modelIds),
        IMAGE_GENERATION_MODEL_IDS: JSON.stringify(imageGenerationModelIds),
        CROSS_ACCOUNT_BEDROCK_ROLE_ARN: crossAccountBedrockRoleArn ?? '',
        BUCKET_NAME: fileBucket.bucketName,
        ...(props.guardrailIdentify ? { GUARDRAIL_IDENTIFIER: props.guardrailIdentify } : {}),
        ...(props.guardrailVersion ? { GUARDRAIL_VERSION: props.guardrailVersion } : {}),
        ...(props.inferenceProfileMap
          ? { INFERENCE_PROFILE_MAP: JSON.stringify(props.inferenceProfileMap) }
          : {}),
      },
    });
    fileBucket.grantReadWrite(predictStreamFunction);
    authenticatedRole.grant(predictStreamFunction.role!, 'lambda:InvokeFunction');

    const predictTitleFunction = new NodejsFunction(this, 'PredictTitle', {
      runtime: Runtime.NODEJS_22_X,
      entry: './lambda/predictTitle.ts',
      timeout: Duration.minutes(15),
      environment: {
        TABLE_NAME: table.tableName,
        MODEL_REGION: modelRegion,
        MODEL_IDS: JSON.stringify(modelIds),
        IMAGE_GENERATION_MODEL_IDS: JSON.stringify(imageGenerationModelIds),
        CROSS_ACCOUNT_BEDROCK_ROLE_ARN: crossAccountBedrockRoleArn ?? '',
        ...(props.guardrailIdentify ? { GUARDRAIL_IDENTIFIER: props.guardrailIdentify } : {}),
        ...(props.guardrailVersion ? { GUARDRAIL_VERSION: props.guardrailVersion } : {}),
        ...(props.inferenceProfileMap
          ? { INFERENCE_PROFILE_MAP: JSON.stringify(props.inferenceProfileMap) }
          : {}),
      },
    });
    table.grantWriteData(predictTitleFunction);

    const generateImageFunction = new NodejsFunction(this, 'GenerateImage', {
      runtime: Runtime.NODEJS_22_X,
      entry: './lambda/generateImage.ts',
      timeout: Duration.minutes(15),
      environment: {
        MODEL_REGION: modelRegion,
        MODEL_IDS: JSON.stringify(modelIds),
        IMAGE_GENERATION_MODEL_IDS: JSON.stringify(imageGenerationModelIds),
        CROSS_ACCOUNT_BEDROCK_ROLE_ARN: crossAccountBedrockRoleArn ?? '',
        ...(props.imageInferenceProfileMap
          ? { IMAGE_INFERENCE_PROFILE_MAP: JSON.stringify(props.imageInferenceProfileMap) }
          : {}),
      },
    });

    // SageMaker Endpoint がある場合は権限付与
    if (endpointNames.length > 0) {
      // SageMaker Policy
      const sagemakerPolicy = new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['sagemaker:DescribeEndpoint', 'sagemaker:InvokeEndpoint'],
        resources: endpointNames.map(
          (endpointName) =>
            `arn:aws:sagemaker:${modelRegion}:${Stack.of(this).account}:endpoint/${endpointName}`,
        ),
      });
      predictFunction.role?.addToPrincipalPolicy(sagemakerPolicy);
      predictStreamFunction.role?.addToPrincipalPolicy(sagemakerPolicy);
      predictTitleFunction.role?.addToPrincipalPolicy(sagemakerPolicy);
      generateImageFunction.role?.addToPrincipalPolicy(sagemakerPolicy);
    }

    if (typeof crossAccountBedrockRoleArn !== 'string' || crossAccountBedrockRoleArn === '') {
      // 同一アカウントの Bedrock を使用する場合
      const bedrockInvokePolicy = new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['bedrock:InvokeModel', 'bedrock:InvokeModelWithResponseStream'],
        resources: ['*'],
      });
      predictFunction.role?.addToPrincipalPolicy(bedrockInvokePolicy);
      predictStreamFunction.role?.addToPrincipalPolicy(bedrockInvokePolicy);
      predictTitleFunction.role?.addToPrincipalPolicy(bedrockInvokePolicy);
      generateImageFunction.role?.addToPrincipalPolicy(bedrockInvokePolicy);
    } else {
      const assumeRolePolicy = new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['sts:AssumeRole'],
        resources: [crossAccountBedrockRoleArn],
      });
      predictFunction.role?.addToPrincipalPolicy(assumeRolePolicy);
      predictStreamFunction.role?.addToPrincipalPolicy(assumeRolePolicy);
      predictTitleFunction.role?.addToPrincipalPolicy(assumeRolePolicy);
      generateImageFunction.role?.addToPrincipalPolicy(assumeRolePolicy);
    }

    // AWS Marketplace Policy for Converse API functions
    const marketplacePolicy = new PolicyStatement({
      effect: Effect.ALLOW,
      actions: [
        'aws-marketplace:Subscribe',
        'aws-marketplace:Unsubscribe',
        'aws-marketplace:ViewSubscriptions',
      ],
      resources: ['*'],
    });
    predictStreamFunction.role?.addToPrincipalPolicy(marketplacePolicy);
    predictFunction.role?.addToPrincipalPolicy(marketplacePolicy);
    predictTitleFunction.role?.addToPrincipalPolicy(marketplacePolicy);

    const createChatFunction = new NodejsFunction(this, 'CreateChat', {
      runtime: Runtime.NODEJS_22_X,
      entry: './lambda/createChat.ts',
      timeout: Duration.minutes(15),
      environment: {
        TABLE_NAME: table.tableName,
        TTL_DAYS: props.dynamoDbTtlDays.toString(),
      },
    });
    table.grantWriteData(createChatFunction);

    const deleteChatFunction = new NodejsFunction(this, 'DeleteChat', {
      runtime: Runtime.NODEJS_22_X,
      entry: './lambda/deleteChat.ts',
      timeout: Duration.minutes(15),
      environment: {
        TABLE_NAME: table.tableName,
      },
    });
    table.grantReadWriteData(deleteChatFunction);

    const createMessagesFunction = new NodejsFunction(this, 'CreateMessages', {
      runtime: Runtime.NODEJS_22_X,
      entry: './lambda/createMessages.ts',
      timeout: Duration.minutes(15),
      environment: {
        TABLE_NAME: table.tableName,
        BUCKET_NAME: fileBucket.bucketName,
        TTL_DAYS: props.dynamoDbTtlDays.toString(),
      },
    });
    table.grantReadWriteData(createMessagesFunction);

    const updateChatTitleFunction = new NodejsFunction(this, 'UpdateChatTitle', {
      runtime: Runtime.NODEJS_22_X,
      entry: './lambda/updateTitle.ts',
      timeout: Duration.minutes(15),
      environment: {
        TABLE_NAME: table.tableName,
      },
    });
    table.grantReadWriteData(updateChatTitleFunction);

    const listChatsFunction = new NodejsFunction(this, 'ListChats', {
      runtime: Runtime.NODEJS_22_X,
      entry: './lambda/listChats.ts',
      timeout: Duration.minutes(15),
      environment: {
        TABLE_NAME: table.tableName,
      },
    });
    table.grantReadData(listChatsFunction);

    const findChatbyIdFunction = new NodejsFunction(this, 'FindChatbyId', {
      runtime: Runtime.NODEJS_22_X,
      entry: './lambda/findChatById.ts',
      timeout: Duration.minutes(15),
      environment: {
        TABLE_NAME: table.tableName,
      },
    });
    table.grantReadData(findChatbyIdFunction);

    const listMessagesFunction = new NodejsFunction(this, 'ListMessages', {
      runtime: Runtime.NODEJS_22_X,
      entry: './lambda/listMessages.ts',
      timeout: Duration.minutes(15),
      environment: {
        TABLE_NAME: table.tableName,
      },
    });
    table.grantReadData(listMessagesFunction);

    const listSystemContextsFunction = new NodejsFunction(this, 'ListSystemContexts', {
      runtime: Runtime.NODEJS_22_X,
      entry: './lambda/listSystemContexts.ts',
      timeout: Duration.minutes(15),
      environment: {
        TABLE_NAME: table.tableName,
      },
    });
    table.grantReadData(listSystemContextsFunction);

    const createSystemContextFunction = new NodejsFunction(this, 'CreateSystemContexts', {
      runtime: Runtime.NODEJS_22_X,
      entry: './lambda/createSystemContext.ts',
      timeout: Duration.minutes(15),
      environment: {
        TABLE_NAME: table.tableName,
      },
    });
    table.grantWriteData(createSystemContextFunction);

    const updateSystemContextTitleFunction = new NodejsFunction(this, 'UpdateSystemContextTitle', {
      runtime: Runtime.NODEJS_22_X,
      entry: './lambda/updateSystemContextTitle.ts',
      timeout: Duration.minutes(15),
      environment: {
        TABLE_NAME: table.tableName,
      },
    });
    table.grantReadWriteData(updateSystemContextTitleFunction);

    const deleteSystemContextFunction = new NodejsFunction(this, 'DeleteSystemContexts', {
      runtime: Runtime.NODEJS_22_X,
      entry: './lambda/deleteSystemContext.ts',
      timeout: Duration.minutes(15),
      environment: {
        TABLE_NAME: table.tableName,
      },
    });
    table.grantReadWriteData(deleteSystemContextFunction);

    // Cognito Identity Pool ID は Lambda が実行時に discovery で解決する。
    // cognito-identity:* の IAM は親スタック側で付与する（循環依存回避）。
    const getSignedUrlFunction = new NodejsFunction(this, 'GetSignedUrl', {
      runtime: Runtime.NODEJS_22_X,
      entry: './lambda/getFileUploadSignedUrl.ts',
      timeout: Duration.minutes(15),
      environment: {
        BUCKET_NAME: fileBucket.bucketName,
        USER_POOL_ID: userPool.userPoolId,
      },
    });
    fileBucket.grantWrite(getSignedUrlFunction);

    const getFileDownloadSignedUrlFunction = new NodejsFunction(
      this,
      'GetFileDownloadSignedUrlFunction',
      {
        runtime: Runtime.NODEJS_22_X,
        entry: './lambda/getFileDownloadSignedUrl.ts',
        timeout: Duration.minutes(15),
        environment: {
          BUCKET_NAME: fileBucket.bucketName,
          USER_POOL_ID: userPool.userPoolId,
        },
      },
    );
    fileBucket.grantRead(getFileDownloadSignedUrlFunction);

    const deleteFileFunction = new NodejsFunction(this, 'DeleteFileFunction', {
      runtime: Runtime.NODEJS_22_X,
      entry: './lambda/deleteFile.ts',
      timeout: Duration.minutes(15),
      environment: {
        BUCKET_NAME: fileBucket.bucketName,
        USER_POOL_ID: userPool.userPoolId,
      },
    });
    fileBucket.grantDelete(deleteFileFunction);

    // API Gateway
    const authorizer = new CognitoUserPoolsAuthorizer(this, 'Authorizer', {
      cognitoUserPools: [userPool],
    });

    const commonAuthorizerProps = {
      authorizationType: AuthorizationType.COGNITO,
      authorizer,
    };

    const api = new RestApi(this, 'Api', {
      deployOptions: {
        stageName: 'api',
      },
      defaultCorsPreflightOptions: {
        allowOrigins: Cors.ALL_ORIGINS,
        allowMethods: Cors.ALL_METHODS,
      },
      cloudWatchRole: true,
    });

    api.addGatewayResponse('Api4XX', {
      type: ResponseType.DEFAULT_4XX,
      responseHeaders: {
        'Access-Control-Allow-Origin': "'*'",
      },
    });

    api.addGatewayResponse('Api5XX', {
      type: ResponseType.DEFAULT_5XX,
      responseHeaders: {
        'Access-Control-Allow-Origin': "'*'",
      },
    });

    const predictResource = api.root.addResource('predict');

    // POST: /predict
    predictResource.addMethod(
      'POST',
      new LambdaIntegration(predictFunction),
      commonAuthorizerProps,
    );

    // POST: /predict/title
    const predictTitleResource = predictResource.addResource('title');
    predictTitleResource.addMethod(
      'POST',
      new LambdaIntegration(predictTitleFunction),
      commonAuthorizerProps,
    );

    const chatsResource = api.root.addResource('chats');

    // POST: /chats
    chatsResource.addMethod(
      'POST',
      new LambdaIntegration(createChatFunction),
      commonAuthorizerProps,
    );

    // GET: /chats
    chatsResource.addMethod('GET', new LambdaIntegration(listChatsFunction), commonAuthorizerProps);

    const chatResource = chatsResource.addResource('{chatId}');

    // GET: /chats/{chatId}
    chatResource.addMethod(
      'GET',
      new LambdaIntegration(findChatbyIdFunction),
      commonAuthorizerProps,
    );

    // DELETE: /chats/{chatId}
    chatResource.addMethod(
      'DELETE',
      new LambdaIntegration(deleteChatFunction),
      commonAuthorizerProps,
    );

    const titleResource = chatResource.addResource('title');

    // PUT: /chats/{chatId}/title
    titleResource.addMethod(
      'PUT',
      new LambdaIntegration(updateChatTitleFunction),
      commonAuthorizerProps,
    );

    const messagesResource = chatResource.addResource('messages');

    // GET: /chats/{chatId}/messages
    messagesResource.addMethod(
      'GET',
      new LambdaIntegration(listMessagesFunction),
      commonAuthorizerProps,
    );

    // POST: /chats/{chatId}/messages
    messagesResource.addMethod(
      'POST',
      new LambdaIntegration(createMessagesFunction),
      commonAuthorizerProps,
    );

    const systemContextsResource = api.root.addResource('systemcontexts');

    // POST: /systemcontexts
    systemContextsResource.addMethod(
      'POST',
      new LambdaIntegration(createSystemContextFunction),
      commonAuthorizerProps,
    );

    // GET: /systemcontexts
    systemContextsResource.addMethod(
      'GET',
      new LambdaIntegration(listSystemContextsFunction),
      commonAuthorizerProps,
    );

    const systemContextResource = systemContextsResource.addResource('{systemContextId}');

    // DELETE: /systemcontexts/{systemContextId}
    systemContextResource.addMethod(
      'DELETE',
      new LambdaIntegration(deleteSystemContextFunction),
      commonAuthorizerProps,
    );

    const systemContextTitleResource = systemContextResource.addResource('title');

    // PUT: /systemcontexts/{systemContextId}/title
    systemContextTitleResource.addMethod(
      'PUT',
      new LambdaIntegration(updateSystemContextTitleFunction),
      commonAuthorizerProps,
    );

    const imageResource = api.root.addResource('image');
    const imageGenerateResource = imageResource.addResource('generate');
    // POST: /image/generate
    imageGenerateResource.addMethod(
      'POST',
      new LambdaIntegration(generateImageFunction),
      commonAuthorizerProps,
    );

    const fileResource = api.root.addResource('file');
    const urlResource = fileResource.addResource('url');
    // POST: /file/url
    urlResource.addMethod(
      'POST',
      new LambdaIntegration(getSignedUrlFunction),
      commonAuthorizerProps,
    );
    // Get: /file/url
    urlResource.addMethod(
      'GET',
      new LambdaIntegration(getFileDownloadSignedUrlFunction),
      commonAuthorizerProps,
    );
    // DELETE: /file/{fileName}
    fileResource
      .addResource('{fileName}')
      .addMethod('DELETE', new LambdaIntegration(deleteFileFunction), commonAuthorizerProps);

    this.api = api;
    this.predictStreamFunction = predictStreamFunction;
    this.modelRegion = modelRegion;
    this.modelIds = modelIds;
    this.imageGenerationModelIds = imageGenerationModelIds;
    this.endpointNames = endpointNames;
    this.fileBucket = fileBucket;
    this.getSignedUrlFunction = getSignedUrlFunction;
    this.getFileDownloadSignedUrlFunction = getFileDownloadSignedUrlFunction;
    this.deleteFileFunction = deleteFileFunction;

    // NagSuppressions for KMS wildcard permissions
    NagSuppressions.addStackSuppressions(
      Stack.of(this),
      [
        {
          id: 'AwsSolutions-IAM5',
          reason:
            'KMS wildcard permissions (GenerateDataKey* and ReEncrypt*) are required for DynamoDB and S3 encryption operations with customer-managed keys.',
          appliesTo: ['Action::kms:GenerateDataKey*', 'Action::kms:ReEncrypt*'],
        },
      ],
      true,
    );
  }

  // Bucket 名を指定してダウンロード可能にする
  allowDownloadFile(bucketName: string) {
    this.getFileDownloadSignedUrlFunction.role?.addToPrincipalPolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        resources: [`arn:aws:s3:::${bucketName}`, `arn:aws:s3:::${bucketName}/*`],
        actions: ['s3:GetBucket*', 's3:GetObject*', 's3:List*'],
      }),
    );
  }
}
