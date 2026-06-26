import { Stack } from 'aws-cdk-lib';
import * as bedrock from 'aws-cdk-lib/aws-bedrock';
import { Construct } from 'constructs';

/**
 * Configuration for BedrockInferenceProfiles construct
 */
export interface BedrockInferenceProfilesProps {
  /**
   * List of model IDs to create inference profiles for
   * @example ['anthropic.claude-3-sonnet-20240229-v1:0', 'amazon.nova-pro-v1:0']
   */
  readonly modelIds: string[];

  /**
   * List of image generation model IDs to create inference profiles for
   * @example ['amazon.nova-canvas-v1:0']
   */
  readonly imageGenerationModelIds: string[];

  /**
   * The region where models are deployed
   */
  readonly modelRegion: string;

  /**
   * Environment tag value for cost allocation
   * @example 'production', 'staging', 'development'
   */
  readonly appEnv: string;
}

/**
 * Mapping from model ID to inference profile ARN
 */
export interface InferenceProfileMapping {
  [modelId: string]: string;
}

/**
 * Creates Application Inference Profiles for Bedrock models with Environment tags
 * for cost allocation tracking.
 *
 * Application Inference Profiles allow:
 * - Tracking usage metrics with CloudWatch logs
 * - Attaching tags for cost allocation
 * - Cross-region inference for increased throughput
 *
 * @see https://docs.aws.amazon.com/bedrock/latest/userguide/inference-profiles.html
 *
 * @example
 * ```typescript
 * const inferenceProfiles = new BedrockInferenceProfiles(this, 'InferenceProfiles', {
 *   modelIds: ['anthropic.claude-3-sonnet-20240229-v1:0'],
 *   imageGenerationModelIds: ['amazon.nova-canvas-v1:0'],
 *   modelRegion: 'us-east-1',
 *   appEnv: 'production',
 * });
 *
 * // Use the mapping in Lambda environment variables
 * new NodejsFunction(this, 'MyFunction', {
 *   environment: {
 *     INFERENCE_PROFILE_MAP: JSON.stringify(inferenceProfiles.profileMapping),
 *   },
 * });
 * ```
 */
export class BedrockInferenceProfiles extends Construct {
  /**
   * Mapping from original model ID to inference profile ARN
   */
  public readonly profileMapping: InferenceProfileMapping = {};

  /**
   * Mapping from original image generation model ID to inference profile ARN
   */
  public readonly imageProfileMapping: InferenceProfileMapping = {};

  constructor(scope: Construct, id: string, props: BedrockInferenceProfilesProps) {
    super(scope, id);

    const { modelIds, imageGenerationModelIds, modelRegion, appEnv } = props;
    const account = Stack.of(this).account;

    // Create inference profiles for text generation models
    for (const modelId of modelIds) {
      const profile = this.createInferenceProfile(modelId, modelRegion, account, appEnv, 'text');
      this.profileMapping[modelId] = profile.attrInferenceProfileArn;
    }

    // Create inference profiles for image generation models
    for (const modelId of imageGenerationModelIds) {
      const profile = this.createInferenceProfile(modelId, modelRegion, account, appEnv, 'image');
      this.imageProfileMapping[modelId] = profile.attrInferenceProfileArn;
    }
  }

  /**
   * Creates an Application Inference Profile for a model
   */
  private createInferenceProfile(
    modelId: string,
    modelRegion: string,
    account: string,
    appEnv: string,
    modelType: 'text' | 'image',
  ): bedrock.CfnApplicationInferenceProfile {
    // Create a safe construct ID from model ID
    const safeId = this.sanitizeModelId(modelId);

    // Determine the source ARN
    // For cross-region inference profiles (e.g., us.anthropic.claude-*), use the model ID directly
    // For regular models, construct the foundation model ARN
    const sourceArn = this.getModelSourceArn(modelId, modelRegion, account);

    const profile = new bedrock.CfnApplicationInferenceProfile(this, `Profile-${safeId}`, {
      inferenceProfileName: `${safeId}-${appEnv}`,
      description: `Inference profile for ${modelId} in ${appEnv} environment`,
      modelSource: {
        copyFrom: sourceArn,
      },
      tags: [
        { key: 'Environment', value: appEnv },
        { key: 'ModelId', value: modelId },
        { key: 'ModelType', value: modelType },
        { key: 'ManagedBy', value: 'CDK' },
      ],
    });

    return profile;
  }

  /**
   * Sanitize model ID to create a valid construct ID
   * Replaces dots, colons, and slashes with hyphens
   */
  private sanitizeModelId(modelId: string): string {
    return modelId.replace(/[.:/]/g, '-');
  }

  /**
   * Get the model source ARN for the inference profile
   *
   * For cross-region inference profiles (prefixed with region like 'us.'),
   * returns the system-defined inference profile ARN.
   * For regular foundation models, returns the foundation model ARN.
   */
  private getModelSourceArn(modelId: string, modelRegion: string, account: string): string {
    // Check if this is a cross-region inference profile (e.g., us.anthropic.claude-*)
    if (modelId.match(/^[a-z]{2}\./)) {
      // Cross-region inference profile - use the system-defined inference profile ARN
      // Format: arn:aws:bedrock:{region}:{account}:inference-profile/{model-id}
      // For system-defined profiles, the account is empty
      return `arn:aws:bedrock:${modelRegion}::inference-profile/${modelId}`;
    }

    // Regular foundation model - construct the foundation model ARN
    // Format: arn:aws:bedrock:{region}::foundation-model/{model-id}
    return `arn:aws:bedrock:${modelRegion}::foundation-model/${modelId}`;
  }
}
