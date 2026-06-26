import {
  AccessDeniedException,
  BedrockRuntimeClient,
  ConverseCommand,
  ConverseCommandInput,
  ConverseCommandOutput,
  ConverseStreamCommand,
  ConverseStreamCommandInput,
  ConverseStreamOutput,
  InvokeModelCommand,
  ServiceQuotaExceededException,
  SystemContentBlock,
  ThrottlingException,
} from '@aws-sdk/client-bedrock-runtime';
import { fromTemporaryCredentials } from '@aws-sdk/credential-providers';
import {
  ApiInterface,
  BedrockImageGenerationResponse,
  GenerateImageParams,
  UnrecordedMessage,
} from 'genai-web';
import { BEDROCK_IMAGE_GEN_MODELS, BEDROCK_TEXT_GEN_MODELS } from './models';
import { streamingChunk } from './streamingChunk';

/**
 * Get inference profile ARN for a model ID if available.
 * Falls back to the original model ID if no inference profile is configured.
 *
 * @param modelId - The original model ID
 * @returns The inference profile ARN or the original model ID
 */
const getInferenceProfileArn = (modelId: string): string => {
  const profileMapStr = process.env.INFERENCE_PROFILE_MAP;
  if (!profileMapStr) {
    return modelId;
  }

  try {
    const profileMap: { [key: string]: string } = JSON.parse(profileMapStr);
    return profileMap[modelId] || modelId;
  } catch {
    console.warn('Failed to parse INFERENCE_PROFILE_MAP, using original model ID');
    return modelId;
  }
};

/**
 * Get inference profile ARN for an image generation model ID if available.
 * Falls back to the original model ID if no inference profile is configured.
 *
 * @param modelId - The original model ID
 * @returns The inference profile ARN or the original model ID
 */
const getImageInferenceProfileArn = (modelId: string): string => {
  const profileMapStr = process.env.IMAGE_INFERENCE_PROFILE_MAP;
  if (!profileMapStr) {
    return modelId;
  }

  try {
    const profileMap: { [key: string]: string } = JSON.parse(profileMapStr);
    return profileMap[modelId] || modelId;
  } catch {
    console.warn('Failed to parse IMAGE_INFERENCE_PROFILE_MAP, using original model ID');
    return modelId;
  }
};

// Singleton instance of BedrockRuntimeClient
let bedrockClientInstance: BedrockRuntimeClient | null = null;

/**
 * Get or create BedrockRuntimeClient singleton instance
 * @returns BedrockRuntimeClient instance
 */
const getBedrockClient = (): BedrockRuntimeClient => {
  if (!bedrockClientInstance) {
    bedrockClientInstance = initBedrockClient();
  }
  return bedrockClientInstance;
};

/**
 * Initialize BedrockRuntimeClient with credentials
 *
 * BedrockRuntimeClient を初期化するこの関数は、通常では単純に BedrockRuntimeClient を環境変数で指定されたリージョンで初期化します。
 * 特別なケースとして、異なる AWS アカウントに存在する Bedrock リソースを利用したい場合があります。
 * そのような場合、CROSS_ACCOUNT_BEDROCK_ROLE_ARN 環境変数が設定されているかをチェックします。(cdk.json で crossAccountBedrockRoleArn が設定されている場合に環境変数として設定される)
 * 設定されている場合、fromTemporaryCredentials を使用して一時的な認証情報を自動更新する CredentialsProvider を作成し、BedrockRuntimeClient を初期化します。
 * これにより、別の AWS アカウントの Bedrock リソースへのアクセスが可能になり、認証情報の期限切れも自動的に処理されます。
 *
 * @returns BedrockRuntimeClient instance
 */
const initBedrockClient = (): BedrockRuntimeClient => {
  // CROSS_ACCOUNT_BEDROCK_ROLE_ARN が設定されているかチェック
  if (process.env.CROSS_ACCOUNT_BEDROCK_ROLE_ARN) {
    // fromTemporaryCredentials を使用して自動更新される認証情報プロバイダーを作成
    const credentials = fromTemporaryCredentials({
      params: {
        RoleArn: process.env.CROSS_ACCOUNT_BEDROCK_ROLE_ARN,
        RoleSessionName: 'BedrockApiAccess',
      },
      clientConfig: { region: process.env.MODEL_REGION },
    });

    return new BedrockRuntimeClient({
      region: process.env.MODEL_REGION,
      credentials, // CredentialsProvider として渡す（自動更新される）
    });
  } else {
    // STSを使用しない場合のクライアント初期化
    return new BedrockRuntimeClient({
      region: process.env.MODEL_REGION,
    });
  }
};

const appendCachePointToSystem = (
  system: SystemContentBlock[] | undefined,
  ttl: 'none' | '5m' | '1h',
): SystemContentBlock[] | undefined => {
  if (!system || system.length === 0) return system;
  const cachePoint: { type: 'default'; ttl?: '5m' | '1h' } =
    ttl === 'none' ? { type: 'default' } : { type: 'default', ttl };
  return [...system, { cachePoint } as SystemContentBlock.CachePointMember];
};

const createConverseCommandInput = (
  model: string,
  messages: UnrecordedMessage[],
  id: string,
): ConverseCommandInput => {
  const modelConfig = BEDROCK_TEXT_GEN_MODELS[model];
  const input = modelConfig.createConverseCommandInput(
    messages,
    id,
    model,
    modelConfig.defaultParams,
    modelConfig.usecaseParams,
  );
  if (modelConfig.promptCacheTtl) {
    input.system = appendCachePointToSystem(input.system, modelConfig.promptCacheTtl);
  }
  return input;
};

const createConverseStreamCommandInput = (
  model: string,
  messages: UnrecordedMessage[],
  id: string,
): ConverseStreamCommandInput => {
  const modelConfig = BEDROCK_TEXT_GEN_MODELS[model];
  const input = modelConfig.createConverseStreamCommandInput(
    messages,
    id,
    model,
    modelConfig.defaultParams,
    modelConfig.usecaseParams,
  );
  if (modelConfig.promptCacheTtl) {
    input.system = appendCachePointToSystem(input.system, modelConfig.promptCacheTtl);
  }
  return input;
};

const extractConverseOutputText = (model: string, output: ConverseCommandOutput): string => {
  const modelConfig = BEDROCK_TEXT_GEN_MODELS[model];
  return modelConfig.extractConverseOutputText(output);
};

const extractConverseStreamOutputText = (model: string, output: ConverseStreamOutput): string => {
  const modelConfig = BEDROCK_TEXT_GEN_MODELS[model];
  return modelConfig.extractConverseStreamOutputText(output);
};

const createBodyImage = (model: string, params: GenerateImageParams): string => {
  const modelConfig = BEDROCK_IMAGE_GEN_MODELS[model];
  return modelConfig.createBodyImage(params);
};

const extractOutputImage = (model: string, response: BedrockImageGenerationResponse): string => {
  const modelConfig = BEDROCK_IMAGE_GEN_MODELS[model];
  return modelConfig.extractOutputImage(response);
};

const bedrockApi: Omit<ApiInterface, 'invokeFlow'> = {
  invoke: async (model, messages, id) => {
    const client = getBedrockClient();

    const converseCommandInput = createConverseCommandInput(model.modelId, messages, id);
    // Use inference profile ARN if available for cost allocation tagging
    converseCommandInput.modelId = getInferenceProfileArn(model.modelId);
    const command = new ConverseCommand(converseCommandInput);
    const output = await client.send(command);

    return extractConverseOutputText(model.modelId, output);
  },
  invokeStream: async function* (model, messages, id) {
    const client = getBedrockClient();

    try {
      const converseStreamCommandInput = createConverseStreamCommandInput(
        model.modelId,
        messages,
        id,
      );
      // Use inference profile ARN if available for cost allocation tagging
      converseStreamCommandInput.modelId = getInferenceProfileArn(model.modelId);

      const command = new ConverseStreamCommand(converseStreamCommandInput);

      const responseStream = await client.send(command);

      if (!responseStream.stream) {
        return;
      }

      for await (const response of responseStream.stream) {
        if (!response) {
          break;
        }

        const outputText = extractConverseStreamOutputText(model.modelId, response);

        if (outputText) {
          yield streamingChunk({ text: outputText });
        }

        if (response.messageStop) {
          yield streamingChunk({
            text: '',
            stopReason: response.messageStop.stopReason,
          });
          break;
        }
      }
    } catch (e) {
      if (e instanceof ThrottlingException || e instanceof ServiceQuotaExceededException) {
        yield streamingChunk({
          text: 'ただいまアクセスが集中しているため時間をおいて試してみてください。',
          stopReason: 'error',
        });
      } else if (e instanceof AccessDeniedException) {
        const modelAccessURL = `https://${process.env.MODEL_REGION}.console.aws.amazon.com/bedrock/home?region=${process.env.MODEL_REGION}#/modelaccess`;
        yield streamingChunk({
          text: `選択したモデルが有効化されていないようです。[Bedrock コンソールの Model Access 画面](${modelAccessURL})にて、利用したいモデルを有効化してください。`,
          stopReason: 'error',
        });
      } else {
        console.error(e);
        const errorMessage = 'エラーが発生しました。管理者に以下のエラーを報告してください。\n' + e;
        yield streamingChunk({
          text: errorMessage.includes('Unsupported MIME type')
            ? 'エラーが発生しました。送信したファイルの文字コードがサポート外（Shift-JIS形式等）の可能性があります。\nファイルの文字コードを確認し、 UTF-8 形式に変換してから再度お試しください。'
            : errorMessage,
          stopReason: 'error',
        });
      }
    }
  },
  generateImage: async (model, params) => {
    const client = getBedrockClient();

    // Stable Diffusion や Titan Image Generator を利用した画像生成は Converse API に対応していないため、InvokeModelCommand を利用する
    const command = new InvokeModelCommand({
      // Use inference profile ARN if available for cost allocation tagging
      modelId: getImageInferenceProfileArn(model.modelId),
      body: createBodyImage(model.modelId, params),
      contentType: 'application/json',
    });
    const res = await client.send(command);
    const body = JSON.parse(Buffer.from(res.body).toString('utf-8'));

    return extractOutputImage(model.modelId, body);
  },
};

export default bedrockApi;
