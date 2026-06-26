import { aws_ec2, RemovalPolicy, Stack } from 'aws-cdk-lib';
import {
  FlowLogDestination,
  FlowLogTrafficType,
  IpAddresses,
  SubnetType,
  Vpc,
} from 'aws-cdk-lib/aws-ec2';
import * as kms from 'aws-cdk-lib/aws-kms';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
import { NagSuppressions } from 'cdk-nag';
import { Construct } from 'constructs';

export class InvokeExAppLambdaVpc extends Construct {
  public readonly vpc: Vpc;
  public readonly eipAllocationForNat: string[] | undefined;

  constructor(
    scope: Construct,
    id: string,
    props: {
      encryptionKey: kms.IKey;
      maxAzs: number;
      cidr: string;
      cidrMask: number;
    },
  ) {
    super(scope, id);

    // Vpc logging - 60 days
    const cwLogs = new LogGroup(this, 'vpc-logs', {
      retention: RetentionDays.TWO_MONTHS,
      removalPolicy: RemovalPolicy.DESTROY,
      encryptionKey: props.encryptionKey,
    });

    // Create VPC - Private and public subnets
    const vpcTempProps: any = {
      ipAddresses: IpAddresses.cidr(props.cidr),
      vpcName: `${id}-vpc`,
      subnetConfiguration: [
        {
          cidrMask: props.cidrMask,
          name: 'public-subnet',
          subnetType: SubnetType.PUBLIC,
        },
        {
          cidrMask: props.cidrMask,
          name: 'private-subnet',
          subnetType: SubnetType.PRIVATE_WITH_EGRESS,
        },
      ],
      maxAzs: props.maxAzs,
      flowLogs: {
        FlowLogGroup: {
          trafficType: FlowLogTrafficType.REJECT,
          destination: FlowLogDestination.toCloudWatchLogs(cwLogs),
        },
      },
    };

    this.eipAllocationForNat = [];
    const eipAllocationIds: string[] = [];

    for (let i = 0; i < props.maxAzs; i++) {
      const eip = new aws_ec2.CfnEIP(this, `${id}-nat-eip${i}`, {});
      this.eipAllocationForNat.push(eip.attrPublicIp);
      eipAllocationIds.push(eip.attrAllocationId);
    }

    vpcTempProps.natGatewayProvider = aws_ec2.NatProvider.gateway({
      eipAllocationIds,
    });

    const vpcProps: aws_ec2.VpcProps = vpcTempProps;
    this.vpc = new Vpc(this, 'vpc', vpcProps);

    // Vpc endpoints for dynamodb and secretsmanager
    this.vpc.addGatewayEndpoint('DynamoDbEndpoint', {
      service: aws_ec2.GatewayVpcEndpointAwsService.DYNAMODB,
    });
    new aws_ec2.InterfaceVpcEndpoint(this, 'SecretsManagerEndPoint', {
      vpc: this.vpc,
      privateDnsEnabled: true,
      service: new aws_ec2.InterfaceVpcEndpointService(
        `com.amazonaws.${Stack.of(this).region}.secretsmanager`,
        443,
      ),
    });
    NagSuppressions.addStackSuppressions(Stack.of(this), [
      { id: 'CdkNagValidationFailure', reason: 'https://github.com/cdklabs/cdk-nag/issues/817' },
    ]);
  }
}
