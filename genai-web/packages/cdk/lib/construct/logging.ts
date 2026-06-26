import * as cdk from 'aws-cdk-lib';
import * as kms from 'aws-cdk-lib/aws-kms';
import { NagSuppressions } from 'cdk-nag';
import { Construct } from 'constructs';

export interface LoggingProps {
  encryptionKey: kms.IKey;
  thisAccount: string;
  thisRegion: string;
  appEnv: string;
  logAccumulationBucketExpirationDays: number;
  DailyExportEventHourUTC: string;
  TransferS3LogsHourUTC: string;
  s3BucketInvocationLog?: string;
  dynamoTableChatLog: string;
  dynamoTableGovAiLog: string;
  dynamoTableExAppLog: string;
  dynamoTableInvokeHistoryLog: string;
  userPoolId: string;
  cognitoLogGroupName?: string;
  destination: {
    accountId: string;
    endpointUrl: string;
  };
}

export class Logging extends Construct {
  private readonly encryptionKey: kms.IKey;

  constructor(scope: Construct, id: string, props: LoggingProps) {
    super(scope, id);

    this.encryptionKey = props.encryptionKey;

    const {
      thisAccount,
      thisRegion,
      appEnv,
      logAccumulationBucketExpirationDays,
      DailyExportEventHourUTC,
      TransferS3LogsHourUTC,
      // s3BucketInvocationLog: s3BucketInvocationLog,
      dynamoTableChatLog,
      dynamoTableGovAiLog,
      dynamoTableExAppLog,
      dynamoTableInvokeHistoryLog,
      userPoolId,
      destination,
    } = props;

    const destinationAccountId = destination.accountId;
    const destinationEndpointUrl = destination.endpointUrl;

    const logGroupRetentionDays = cdk.aws_logs.RetentionDays.ONE_YEAR;

    // Enable Server Access Log to the Log Accumulation Bucket
    const serverAccessLogBucket = new cdk.aws_s3.Bucket(this, 'ServerAccessLogBucket', {
      encryption: cdk.aws_s3.BucketEncryption.KMS,
      encryptionKey: this.encryptionKey,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: false,
      enforceSSL: true,
      blockPublicAccess: cdk.aws_s3.BlockPublicAccess.BLOCK_ALL,
    });

    // S3 Log Accumulation Bucket
    const s3Bucket = new cdk.aws_s3.Bucket(this, `LogAccumulationBucket`, {
      encryption: cdk.aws_s3.BucketEncryption.KMS,
      encryptionKey: this.encryptionKey,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      enforceSSL: true,
      blockPublicAccess: cdk.aws_s3.BlockPublicAccess.BLOCK_ALL,
      objectOwnership: cdk.aws_s3.ObjectOwnership.OBJECT_WRITER,
      lifecycleRules: [
        {
          expiration: cdk.Duration.days(logAccumulationBucketExpirationDays),
        },
      ],
      serverAccessLogsBucket: serverAccessLogBucket,
      serverAccessLogsPrefix: 'access-logs/',
    });

    s3Bucket.addToResourcePolicy(
      new cdk.aws_iam.PolicyStatement({
        effect: cdk.aws_iam.Effect.ALLOW,
        principals: [
          new cdk.aws_iam.ServicePrincipal(`logs.${cdk.Stack.of(this).region}.amazonaws.com`),
        ],
        actions: ['s3:GetBucketAcl'],
        resources: [s3Bucket.bucketArn],
      }),
    );

    s3Bucket.addToResourcePolicy(
      new cdk.aws_iam.PolicyStatement({
        effect: cdk.aws_iam.Effect.ALLOW,
        principals: [
          new cdk.aws_iam.ServicePrincipal(`logs.${cdk.Stack.of(this).region}.amazonaws.com`),
        ],
        actions: ['s3:PutObject'],
        resources: [s3Bucket.arnForObjects(`${appEnv}/cognito-user-activity-logs/*`)],
        conditions: {
          StringEquals: {
            's3:x-amz-acl': 'bucket-owner-full-control',
          },
        },
      }),
    );

    const configs = [
      {
        name: 'UserPoolUsers',
        endpointPath: destinationEndpointUrl + '/user-pool-users',
        codePath: './lambda/lambdaUserPoolUsers/',
        userPoolId: userPoolId,
        exportUserPool: true,
      },
      {
        name: 'ChatLogs',
        endpointPath: destinationEndpointUrl + '/chat-logs',
        codePath: './lambda/lambdaTransferS3Logs/',
        dynamoTableName: dynamoTableChatLog,
        s3BucketName: s3Bucket.bucketName,
        s3Prefix: `${appEnv}/chat-logs/`,
        exportDynamoTable: true,
      },
      {
        name: 'GovAiLogs',
        endpointPath: destinationEndpointUrl + '/gov-ai-logs',
        codePath: './lambda/lambdaTransferS3Logs/',
        dynamoTableName: dynamoTableGovAiLog,
        s3BucketName: s3Bucket.bucketName,
        s3Prefix: `${appEnv}/gov-ai-logs/`,
        exportDynamoTable: true,
      },
      {
        name: 'ExAppLogs',
        endpointPath: destinationEndpointUrl + '/exapp-logs',
        codePath: './lambda/lambdaTransferS3Logs/',
        dynamoTableName: dynamoTableExAppLog,
        s3BucketName: s3Bucket.bucketName,
        s3Prefix: `${appEnv}/exapp-logs/`,
        exportDynamoTable: true,
      },
      {
        name: 'InvokeHistoryLogs',
        endpointPath: destinationEndpointUrl + '/invoke-history-logs',
        codePath: './lambda/lambdaTransferS3Logs/',
        dynamoTableName: dynamoTableInvokeHistoryLog,
        s3BucketName: s3Bucket.bucketName,
        s3Prefix: `${appEnv}/invoke-history-logs/`,
        exportDynamoTable: true,
      },
      {
        name: 'UserActivityLogs',
        endpointPath: destinationEndpointUrl + '/cognito-user-activity-logs',
        codePath: './lambda/lambdaTransferS3Logs/',
        s3BucketName: s3Bucket.bucketName,
        s3Prefix: `${appEnv}/cognito-user-activity-logs/`,
        exportS3: true,
        logType: 'cognito',
      },
      // TODO: アカウント1つに対して1つのバケットに記録されるので、スタック単位でどうするか要検討のためdisabled
      // {
      //   name: 'InvocationLogs',
      //   endpointPath: destinationEndpointUrl + '/invocation-logs',
      //   codePath: './lambda/lambdaTransferS3Logs/',
      //   s3BucketName: props.s3BucketInvocationLog!,
      //   s3Prefix: `bedrock/AWSLogs/${thisAccount}/BedrockModelInvocationLogs/${thisRegion}/`,
      //   exportS3: true,
      // },
    ];

    configs.forEach((config) => {
      if (config.exportUserPool) {
        // Create Lambda to transfer Cognito user pool data to API
        this.createLambdaUserPoolUsers(
          appEnv,
          config.name,
          thisAccount,
          thisRegion,
          config.codePath,
          destinationAccountId,
          config.endpointPath,
          config.userPoolId,
          DailyExportEventHourUTC,
          logGroupRetentionDays,
        );
      }

      if (config.exportDynamoTable) {
        // Create Lambda to export DynamoDB to S3
        this.createLambdaDailyExportFromDynamoDbToS3(
          appEnv,
          config.name,
          thisAccount,
          thisRegion,
          config.dynamoTableName,
          s3Bucket,
          config.s3Prefix,
          DailyExportEventHourUTC,
          logGroupRetentionDays,
        );
      }

      if ((config as any).exportS3 || config.exportDynamoTable) {
        // Create Lambda to transfer data to API
        this.createLambdaTransferS3Logs(
          appEnv,
          config.name,
          config.codePath,
          thisAccount,
          destinationAccountId,
          config.endpointPath,
          (config as any).s3BucketName,
          (config as any).s3Prefix,
          TransferS3LogsHourUTC,
          logGroupRetentionDays,
          (config as any).logType,
        );
      }
    });

    if (props.cognitoLogGroupName) {
      this.createDailyCognitoLogExport(
        appEnv,
        props.cognitoLogGroupName,
        s3Bucket,
        DailyExportEventHourUTC,
        logGroupRetentionDays,
      );
    }
  }

  private createDailyCognitoLogExport(
    appEnv: string,
    cognitoLogGroupName: string,
    s3Bucket: cdk.aws_s3.Bucket,
    DailyExportEventHourUTC: string,
    logGroupRetentionDays: number,
  ) {
    const name = 'CognitoUserActivity';
    const lambdaFunctionName = this.getLambdaFunctionName('ExportLogs', appEnv, name);

    const lambdaRole = new cdk.aws_iam.Role(this, `LambdaRole-${lambdaFunctionName}`, {
      assumedBy: new cdk.aws_iam.ServicePrincipal('lambda.amazonaws.com'),
      description: `Custom role for Lambda function ${lambdaFunctionName}`,
    });

    const lambdaFunction = new cdk.aws_lambda_nodejs.NodejsFunction(this, lambdaFunctionName, {
      functionName: lambdaFunctionName,
      runtime: cdk.aws_lambda.Runtime.NODEJS_22_X,
      entry: './lambda/lambdaExportCognitoLogsToS3/index.ts',
      handler: 'handler',
      role: lambdaRole,
      environment: {
        BUCKET_NAME: s3Bucket.bucketName,
        LOG_GROUP_NAME: cognitoLogGroupName,
        S3_PREFIX: `${appEnv}/cognito-user-activity-logs`,
      },
      timeout: cdk.Duration.minutes(5),
    });

    const logGroup = new cdk.aws_logs.LogGroup(this, `LogGroup-${lambdaFunctionName}`, {
      logGroupName: `/aws/lambda/${lambdaFunctionName}`,
      retention: logGroupRetentionDays,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      encryptionKey: this.encryptionKey,
    });
    logGroup.grantWrite(lambdaFunction);

    lambdaRole.addToPolicy(
      new cdk.aws_iam.PolicyStatement({
        actions: ['logs:CreateExportTask'],
        resources: [
          `arn:${cdk.Stack.of(this).partition}:logs:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:log-group:${cognitoLogGroupName}:*`,
        ],
      }),
    );

    const rule = new cdk.aws_events.Rule(this, `ScheduleRule-${lambdaFunctionName}`, {
      schedule: cdk.aws_events.Schedule.cron({
        minute: '0',
        hour: DailyExportEventHourUTC,
      }),
    });

    rule.addTarget(new cdk.aws_events_targets.LambdaFunction(lambdaFunction));
  }

  private createLambdaDailyExportFromDynamoDbToS3(
    appEnv: string,
    name: string,
    thisAccount: string,
    thisRegion: string,
    dynamoTableName: string,
    s3Bucket: cdk.aws_s3.Bucket,
    s3Prefix: string,
    DailyExportEventHourUTC: string,
    logGroupRetentionDays: number,
  ) {
    const lambdaFunctionName = this.getLambdaFunctionName('ExportDdbToS3', appEnv, name);
    // Custom IAM role for Lambda function
    const lambdaRole = new cdk.aws_iam.Role(this, `LambdaRole-${lambdaFunctionName}`, {
      assumedBy: new cdk.aws_iam.ServicePrincipal('lambda.amazonaws.com'),
      description: `Custom role for Lambda function ${lambdaFunctionName}`,
    });

    // Lambda
    const lambdaFunction = new cdk.aws_lambda_nodejs.NodejsFunction(this, lambdaFunctionName, {
      functionName: lambdaFunctionName,
      runtime: cdk.aws_lambda.Runtime.NODEJS_22_X,
      entry: './lambda/lambdaDailyExportFromDynamoDbToS3/index.ts',
      handler: 'handler',
      role: lambdaRole,
      timeout: cdk.Duration.minutes(5),
      environment: {
        TABLE_ARN: `arn:aws:dynamodb:${thisRegion}:${thisAccount}:table/${dynamoTableName}`,
        BUCKET_NAME: s3Bucket.bucketName,
        S3_PREFIX: s3Prefix,
      },
      bundling: {},
    });

    // Logging Lambda execution
    const logGroup = new cdk.aws_logs.LogGroup(this, `LogGroup-${lambdaFunctionName}`, {
      logGroupName: `/aws/lambda/${lambdaFunctionName}`,
      retention: logGroupRetentionDays,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });
    // Grant Lambda permission to write to the log group
    logGroup.grantWrite(lambdaFunction);

    // Grant DynamoDB export permissions to Lambda
    lambdaRole.addToPolicy(
      new cdk.aws_iam.PolicyStatement({
        actions: ['dynamodb:ExportTableToPointInTime'],
        resources: [`arn:aws:dynamodb:${thisRegion}:${thisAccount}:table/${dynamoTableName}`],
      }),
    );

    // Grant S3 PutObject permission to Lambda
    lambdaRole.addToPolicy(
      new cdk.aws_iam.PolicyStatement({
        actions: ['s3:PutObject'],
        resources: [s3Bucket.bucketArn + '/' + s3Prefix + '*'],
      }),
    );
    NagSuppressions.addResourceSuppressions(
      lambdaRole,
      [
        {
          id: 'AwsSolutions-IAM5',
          reason:
            'Lambda function needs access to all objects with specific prefix in the S3 bucket for log processing',
        },
      ],
      true,
    );

    // Grant KMS permissions for DynamoDB table decryption and S3 bucket encryption
    lambdaRole.addToPolicy(
      new cdk.aws_iam.PolicyStatement({
        actions: [
          'kms:Decrypt', // Required for reading encrypted DynamoDB table data
          'kms:DescribeKey', // Required for key metadata access
          'kms:GenerateDataKey', // Required for generating data keys for S3 encryption
          'kms:Encrypt', // Required for encrypting data written to S3
        ],
        resources: [this.encryptionKey.keyArn],
      }),
    );

    // EventBridge Rule
    const rule = new cdk.aws_events.Rule(
      this,
      `ScheduleRule-LambdaDailyExportFromDynamoDbToS3-${appEnv}-${name}`,
      {
        schedule: cdk.aws_events.Schedule.cron({
          minute: '0',
          hour: DailyExportEventHourUTC,
        }), // Everyday UTC 17:00 (JST 02:00)
      },
    );

    rule.addTarget(new cdk.aws_events_targets.LambdaFunction(lambdaFunction));
  }

  private createLambdaTransferS3Logs(
    appEnv: string,
    name: string,
    codePath: string,
    thisAccount: string,
    destinationAccountId: string,
    endpointUrl: string,
    s3BucketName: string,
    s3Prefix: string,
    TransferS3LogsHourUTC: string,
    logGroupRetentionDays: number,
    logType?: string,
  ) {
    if (!endpointUrl) {
      const errorMessage = `DESTINATION_ENDPOINT_URL for ${appEnv} is not provided.`;
      console.error(errorMessage);
      throw new Error(errorMessage);
    }

    const lambdaFunctionName = this.getLambdaFunctionName('TransferS3Logs', appEnv, name);
    // Custom IAM role for Lambda function
    const lambdaRole = new cdk.aws_iam.Role(this, `LambdaRole-${lambdaFunctionName}`, {
      assumedBy: new cdk.aws_iam.ServicePrincipal('lambda.amazonaws.com'),
      description: `Custom role for Lambda function ${lambdaFunctionName}`,
    });

    const lambdaFunction = new cdk.aws_lambda_nodejs.NodejsFunction(this, lambdaFunctionName, {
      functionName: lambdaFunctionName,
      runtime: cdk.aws_lambda.Runtime.NODEJS_22_X,
      entry: codePath + 'index.ts',
      handler: 'handler',
      role: lambdaRole,
      environment: {
        APP_ENV: appEnv,
        DESTINATION_ACCOUNT_ID: destinationAccountId,
        DESTINATION_ENDPOINT_URL: endpointUrl,
        DESTINATION_ROLE_ARN: `arn:aws:iam::${destinationAccountId}:role/CrossAccountRole-${thisAccount}`,
        S3_BUCKET_NAME: s3BucketName,
        S3_PREFIX: s3Prefix,
        LOG_TYPE: logType || '',
      },
      timeout: cdk.Duration.minutes(5),
      memorySize: 256, // MB // default: 128
      bundling: {},
    });

    // Logging Lambda execution
    const logGroup = new cdk.aws_logs.LogGroup(this, `LogGroup-${lambdaFunctionName}`, {
      logGroupName: `/aws/lambda/${lambdaFunctionName}`,
      retention: logGroupRetentionDays,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });
    // Grant Lambda permission to write to the log group
    logGroup.grantWrite(lambdaFunction);

    // Get ExecutionARN of Lambda function
    const lambdaExecutionArn = lambdaFunction.role!.roleArn;

    // CfnOutput the ExecutionARN
    new cdk.CfnOutput(this, `LambdaExecutionArn-${appEnv}-${name}`, {
      value: lambdaExecutionArn,
      description: `The execution ARN of the Lambda function for ${appEnv}-${name}`,
      exportName: `LambdaExecutionArn-${appEnv}-${name}`,
    });

    // Adds cross-account permissions to the Lambda function's role.
    lambdaRole.addToPolicy(
      new cdk.aws_iam.PolicyStatement({
        effect: cdk.aws_iam.Effect.ALLOW,
        actions: ['sts:AssumeRole'],
        resources: [`arn:aws:iam::${destinationAccountId}:role/CrossAccountRole-${thisAccount}`],
      }),
    );

    // Adds S3 permissions to the Lambda function's role.
    lambdaRole.addToPolicy(
      new cdk.aws_iam.PolicyStatement({
        effect: cdk.aws_iam.Effect.ALLOW,
        actions: ['s3:ListBucket'],
        resources: [`arn:aws:s3:::${s3BucketName}`],
        conditions: {
          StringLike: {
            's3:prefix': [`${s3Prefix}*`],
          },
        },
      }),
    );

    lambdaRole.addToPolicy(
      new cdk.aws_iam.PolicyStatement({
        effect: cdk.aws_iam.Effect.ALLOW,
        actions: ['s3:GetObject'],
        resources: [`arn:aws:s3:::${s3BucketName}/${s3Prefix}*`],
      }),
    );

    NagSuppressions.addResourceSuppressions(
      lambdaRole,
      [
        {
          id: 'AwsSolutions-IAM5',
          reason:
            'Lambda function needs access to all objects with specific prefix in the S3 bucket for log processing',
        },
      ],
      true,
    );

    // EventBridge Rule
    const rule = new cdk.aws_events.Rule(
      this,
      `ScheduleRule-LambdaTransferS3Logs-${appEnv}-${name}`,
      {
        schedule: cdk.aws_events.Schedule.cron({
          minute: '0',
          hour: TransferS3LogsHourUTC,
        }), // Everyday UTC 18:00 (JST 03:00)
      },
    );

    rule.addTarget(new cdk.aws_events_targets.LambdaFunction(lambdaFunction));
  }

  private getLambdaFunctionName(lambdaPrefix: string, appEnv: string, name: string): string {
    return `${lambdaPrefix}-${appEnv}-${name}`;
  }

  private createLambdaUserPoolUsers(
    appEnv: string,
    name: string,
    thisAccount: string,
    thisRegion: string,
    codePath: string,
    destinationAccountId: string,
    endpointUrl: string,
    userPoolId: string,
    TransferS3LogsHourUTC: string,
    logGroupRetentionDays: number,
  ) {
    if (!endpointUrl) {
      const errorMessage = `DESTINATION_ENDPOINT_URL for ${appEnv} is not provided.`;
      console.error(errorMessage);
      throw new Error(errorMessage);
    }

    const lambdaFunctionName = this.getLambdaFunctionName('ExportUserPoolUsers', appEnv, name);

    // Custom IAM role for Lambda function
    const lambdaRole = new cdk.aws_iam.Role(this, `LambdaRole-${lambdaFunctionName}`, {
      assumedBy: new cdk.aws_iam.ServicePrincipal('lambda.amazonaws.com'),
      description: `Custom role for Lambda function ${lambdaFunctionName}`,
    });

    // Create Lambda function
    const lambdaFunction = new cdk.aws_lambda_nodejs.NodejsFunction(this, lambdaFunctionName, {
      functionName: lambdaFunctionName,
      runtime: cdk.aws_lambda.Runtime.NODEJS_22_X,
      entry: codePath + 'index.ts',
      handler: 'handler',
      role: lambdaRole,
      environment: {
        APP_ENV: appEnv,
        DESTINATION_ACCOUNT_ID: destinationAccountId,
        DESTINATION_ENDPOINT_URL: endpointUrl,
        DESTINATION_ROLE_ARN: `arn:aws:iam::${destinationAccountId}:role/CrossAccountRole-${thisAccount}`,
        USER_POOL_ID: userPoolId,
      },
      timeout: cdk.Duration.minutes(5),
      memorySize: 256, // MB // default: 128
      bundling: {},
    });

    // Logging Lambda execution
    const logGroup = new cdk.aws_logs.LogGroup(this, `LogGroup-${lambdaFunctionName}`, {
      logGroupName: `/aws/lambda/${lambdaFunctionName}`,
      retention: logGroupRetentionDays,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });
    // Grant Lambda permission to write to the log group
    logGroup.grantWrite(lambdaFunction);

    // Adds cross-account permissions to the Lambda function's role.
    lambdaRole.addToPolicy(
      new cdk.aws_iam.PolicyStatement({
        effect: cdk.aws_iam.Effect.ALLOW,
        actions: ['sts:AssumeRole'],
        resources: [`arn:aws:iam::${destinationAccountId}:role/CrossAccountRole-${thisAccount}`],
      }),
    );

    lambdaRole.addToPolicy(
      new cdk.aws_iam.PolicyStatement({
        effect: cdk.aws_iam.Effect.ALLOW,
        actions: ['cognito-idp:ListUsers', 'cognito-idp:DescribeUserPool'],
        resources: [`arn:aws:cognito-idp:${thisRegion}:${thisAccount}:userpool/${userPoolId}`],
      }),
    );

    // Get ExecutionARN of Lambda function
    const lambdaExecutionArn = lambdaFunction.role!.roleArn;

    // CfnOutput the ExecutionARN
    new cdk.CfnOutput(this, `LambdaExecutionArn-${appEnv}-${name}`, {
      value: lambdaExecutionArn,
      description: `The execution ARN of the Lambda function for ${appEnv}-${name}`,
      exportName: `LambdaExecutionArn-${appEnv}-${name}`,
    });

    // EventBridge Rule
    const rule = new cdk.aws_events.Rule(
      this,
      `ScheduleRule-LambdaTransferS3Logs-${appEnv}-${name}`,
      {
        schedule: cdk.aws_events.Schedule.cron({
          minute: '0',
          hour: TransferS3LogsHourUTC,
        }), // Everyday UTC 18:00 (JST 03:00)
      },
    );

    rule.addTarget(new cdk.aws_events_targets.LambdaFunction(lambdaFunction));
  }
}
