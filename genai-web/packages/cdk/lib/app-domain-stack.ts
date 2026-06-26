import { Stack, StackProps } from 'aws-cdk-lib';
import {
  Certificate,
  CertificateValidation,
  ICertificate,
} from 'aws-cdk-lib/aws-certificatemanager';
import { HostedZone, IHostedZone, PublicHostedZone } from 'aws-cdk-lib/aws-route53';
import { Construct } from 'constructs';
import { StackInput } from './stack-input';

interface AppDomainStackProps extends StackProps {
  params: StackInput;
}

export class AppDomainStack extends Stack {
  public readonly hostedZone?: IHostedZone;

  public readonly certificate?: ICertificate;

  constructor(scope: Construct, id: string, props: AppDomainStackProps) {
    super(scope, id, props);

    const { appEnv, useHostedZone, hostedZoneId, hostName, domainName, certificateArn } =
      props.params;

    if (useHostedZone) {
      // 既にRoute53でドメイン管理していればそれを使用
      if (hostedZoneId && domainName) {
        this.hostedZone = HostedZone.fromHostedZoneAttributes(
          this,
          `${appEnv}-ExistingHostedZone`,
          {
            hostedZoneId: hostedZoneId,
            zoneName: domainName,
          },
        );
      }

      // HostedZoneが作成されてなければ新規に作成
      if (!this.hostedZone && !hostedZoneId && domainName) {
        this.hostedZone = new PublicHostedZone(this, `${appEnv}-HostedZone`, {
          zoneName: domainName,
        });
      }
    }

    // 既にACMで手動で証明書を作成していればそれを使用
    if (certificateArn) {
      this.certificate = Certificate.fromCertificateArn(
        this,
        `${appEnv}-ExistingCertificate`,
        certificateArn,
      );
    }

    if (!this.hostedZone) {
      return;
    }

    // 証明書が作成されてなければ新規に作成
    if (!this.certificate && hostName && domainName) {
      this.certificate = new Certificate(this, `${appEnv}-Certificate`, {
        domainName: `${hostName}.${domainName}`,
        validation: CertificateValidation.fromDns(this.hostedZone),
      });
    }
  }
}
