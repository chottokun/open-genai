import * as cdk from 'aws-cdk-lib';
import * as kms from 'aws-cdk-lib/aws-kms';
import { Construct } from 'constructs';
import { Logging } from './construct';
import { StackInput } from './stack-input';

interface SourceStackProps extends cdk.StackProps {
  encryptionKey: kms.IKey;
  params: StackInput;
  s3BucketInvocationLog?: string;
  dynamoTableChatLog: string;
  dynamoTableGovAiLog: string;
  dynamoTableExAppLog: string;
  dynamoTableInvokeHistoryLog: string;
  userPoolId: string;
  cognitoLogGroupName?: string;
}

export class LoggingStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: SourceStackProps) {
    super(scope, id, props);

    const params = props.params;

    new Logging(this, 'Logging', {
      encryptionKey: props.encryptionKey,
      thisAccount: this.account,
      thisRegion: this.region,
      appEnv: params.appEnv, // パラメータ"appEnv"で指定する文字列を使用する。cdkのenv（"-dev"や"-prod"）ではない
      logAccumulationBucketExpirationDays: params.logAccumulationBucketExpirationDays,
      DailyExportEventHourUTC: params.DailyExportEventHourUTC,
      TransferS3LogsHourUTC: params.TransferS3LogsHourUTC,
      // s3BucketInvocationLog: props.s3BucketInvocationLog, // TODO: アカウント1つに対して1つのバケットに記録されるので、スタック単位でどうするか要検討のためdisabled
      dynamoTableChatLog: props.dynamoTableChatLog,
      dynamoTableGovAiLog: props.dynamoTableGovAiLog,
      dynamoTableExAppLog: props.dynamoTableExAppLog,
      dynamoTableInvokeHistoryLog: props.dynamoTableInvokeHistoryLog,
      userPoolId: props.userPoolId,
      cognitoLogGroupName: props.cognitoLogGroupName,
      destination: params.destination!,
    });
  }
}
