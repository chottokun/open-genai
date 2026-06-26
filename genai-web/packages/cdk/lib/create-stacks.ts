import * as cdk from 'aws-cdk-lib';
import { IConstruct } from 'constructs';
import { AppDomainStack } from './app-domain-stack';
import { ResourceTaggerAspect } from './aspect/resource-tagger';
import { CloudFrontWafStack } from './cloud-front-waf-stack';
import { GenerativeAiUseCasesStack } from './generative-ai-use-cases-stack';
import { GuardrailStack } from './guardrail-stack';
import { StackInput } from './stack-input';

class DeletionPolicySetter implements cdk.IAspect {
  constructor(private readonly policy: cdk.RemovalPolicy) {}

  visit(node: IConstruct): void {
    if (node instanceof cdk.CfnResource) {
      node.applyRemovalPolicy(this.policy);
    }
  }
}

/**
 * Apply Environment tag to a stack and all its resources.
 * Uses both Tags.of() for standard resources and ResourceTaggerAspect for L1 resources
 * with non-standard tag properties (e.g., CfnIdentityPool).
 *
 * @param stack - The stack to apply tags to
 * @param appEnv - The environment value (defaults to 'default' if empty)
 */
const applyEnvironmentTag = (stack: cdk.Stack, appEnv: string): void => {
  const tagValue = appEnv || 'default';

  // Apply standard tags (handles L2 constructs and most L1 resources)
  cdk.Tags.of(stack).add('Environment', tagValue);

  // Apply Aspect for L1 resources with non-standard tag properties
  cdk.Aspects.of(stack).add(new ResourceTaggerAspect({ tagKey: 'Environment', tagValue }));
};

export const createStacks = (app: cdk.App, params: StackInput) => {
  const appDomainStack = new AppDomainStack(app, `AppDomainStack${params.env}`, {
    env: {
      account: params.account,
      region: 'us-east-1',
    },
    params: params,
    crossRegionReferences: true,
  });

  // CloudFront WAF
  // IP アドレス範囲(v4もしくはv6のいずれか)か地理的制限が定義されている場合のみ、CloudFrontWafStack をデプロイする
  // WAF v2 は us-east-1 でのみデプロイ可能なため、Stack を分けている
  const cloudFrontWafStack =
    params.allowedIpV4AddressRanges || params.allowedIpV6AddressRanges || params.allowedCountryCodes
      ? new CloudFrontWafStack(app, `CloudFrontWafStack${params.env}`, {
          env: {
            account: params.account,
            region: 'us-east-1',
          },
          params: params,
          crossRegionReferences: true,
        })
      : null;

  // Guardrail
  const guardrail = params.guardrailEnabled
    ? new GuardrailStack(app, `GuardrailStack${params.env}`, {
        env: {
          account: params.account,
          region: params.modelRegion,
        },
        crossRegionReferences: true,
      })
    : null;

  // GenU Stack
  const generativeAiUseCasesStack = new GenerativeAiUseCasesStack(
    app,
    `GenerativeAiUseCasesStack${params.env}`,
    {
      env: {
        account: params.account,
        region: params.region,
      },
      description: 'Genai Web Application Stack',
      params: params,
      crossRegionReferences: true,
      // Guardrail
      guardrailIdentifier: guardrail?.guardrailIdentifier,
      guardrailVersion: 'DRAFT',
      // WAF
      webAclId: cloudFrontWafStack?.webAclArn,
      // Custom Domain
      cert: appDomainStack?.certificate,
      hostedZoneId: appDomainStack?.hostedZone?.hostedZoneId,
    },
  );

  cdk.Aspects.of(generativeAiUseCasesStack).add(
    new DeletionPolicySetter(cdk.RemovalPolicy.DESTROY),
  );

  // Apply Environment tags to all stacks
  const appEnv = params.appEnv ?? '';

  // Apply to AppDomainStack (always created)
  applyEnvironmentTag(appDomainStack, appEnv);

  // Apply to CloudFrontWafStack (conditionally created)
  if (cloudFrontWafStack) {
    applyEnvironmentTag(cloudFrontWafStack, appEnv);
  }

  // Apply to GuardrailStack (conditionally created)
  if (guardrail) {
    applyEnvironmentTag(guardrail, appEnv);
  }

  // Apply to GenerativeAiUseCasesStack (main stack)
  applyEnvironmentTag(generativeAiUseCasesStack, appEnv);

  return {
    cloudFrontWafStack,
    guardrail,
    generativeAiUseCasesStack,
  };
};
