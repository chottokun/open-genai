import * as cdk from 'aws-cdk-lib';
import * as ddb from 'aws-cdk-lib/aws-dynamodb';
import * as kms from 'aws-cdk-lib/aws-kms';
import { NagSuppressions } from 'cdk-nag';
import { Construct } from 'constructs';

export interface DatabaseProps {
  encryptionKey: kms.IKey;
  /**
   * Removal policy for the DynamoDB table.
   * - DESTROY: Table will be deleted when the stack is deleted (default)
   * - RETAIN: Table will be retained when the stack is deleted
   */
  removalPolicy?: cdk.RemovalPolicy;
}

export class Database extends Construct {
  public readonly table: ddb.Table;
  public readonly feedbackIndexName: string;
  constructor(scope: Construct, id: string, props: DatabaseProps) {
    super(scope, id);

    const feedbackIndexName = 'FeedbackIndex';
    const table = new ddb.Table(this, 'Table', {
      partitionKey: {
        name: 'id',
        type: ddb.AttributeType.STRING,
      },
      sortKey: {
        name: 'createdDate',
        type: ddb.AttributeType.STRING,
      },
      billingMode: ddb.BillingMode.PAY_PER_REQUEST,
      timeToLiveAttribute: 'expire_at',
      encryption: ddb.TableEncryption.CUSTOMER_MANAGED,
      encryptionKey: props.encryptionKey,
      removalPolicy: props.removalPolicy ?? cdk.RemovalPolicy.DESTROY,
    });

    const cfnTable = table.node.defaultChild as ddb.CfnTable;
    cfnTable.addPropertyOverride('PointInTimeRecoverySpecification', {
      PointInTimeRecoveryEnabled: true,
      RecoveryPeriodInDays: 8,
    });

    table.addGlobalSecondaryIndex({
      indexName: feedbackIndexName,
      partitionKey: {
        name: 'feedback',
        type: ddb.AttributeType.STRING,
      },
    });

    this.table = table;
    this.feedbackIndexName = feedbackIndexName;

    NagSuppressions.addResourceSuppressions(
      table,
      [
        {
          id: 'AwsSolutions-DDB3',
          reason:
            'PITR is enabled but cdk-nag could not check the resource that was override by addPropertyOverride method.',
        },
      ],
      true,
    );
  }
}
