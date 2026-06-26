import { CfnOutput, Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { CommonWebAcl } from './construct/common-web-acl';
import { EncryptionKey } from './construct/kms';
import { StackInput } from './stack-input';

interface CloudFrontWafStackProps extends StackProps {
  params: StackInput;
}

export class CloudFrontWafStack extends Stack {
  public readonly webAclArn: string;
  public readonly webAcl: CommonWebAcl;

  constructor(scope: Construct, id: string, props: CloudFrontWafStackProps) {
    super(scope, id, props);

    const params = props.params;

    // KMS Key for encryption (CMEK) - us-east-1 region
    const encryptionKey = new EncryptionKey(this, 'EncryptionKey', {
      appEnv: params.appEnv,
    });

    if (
      params.allowedIpV4AddressRanges ||
      params.allowedIpV6AddressRanges ||
      params.allowedCountryCodes
    ) {
      const webAcl = new CommonWebAcl(this, `WebAcl${id}`, {
        encryptionKey: encryptionKey.key,
        scope: 'CLOUDFRONT',
        allowedIpV4AddressRanges: params.allowedIpV4AddressRanges,
        allowedIpV6AddressRanges: params.allowedIpV6AddressRanges,
        allowedCountryCodes: params.allowedCountryCodes,
        appEnv: params.appEnv,
      });

      new CfnOutput(this, 'WebAclId', {
        value: webAcl.webAclArn,
      });
      this.webAclArn = webAcl.webAclArn;
      this.webAcl = webAcl;
    }
  }
}
