import type { InvokeExAppHistory } from 'genai-web';
import type { ConversationHistory } from '../types';

type FileData = {
  key: string;
  files: { filename: string; content: string }[];
};

type PayloadData = Record<string, unknown>;

type BuildPayloadParams = {
  data: PayloadData;
  files: FileData[];
  invokeHistory: InvokeExAppHistory | null;
  systemPromptKey?: string;
};

/**
 * AIアプリ実行用のペイロードを構築する
 * @param params - ペイロード構築に必要なパラメータ
 * @returns 構築されたペイロード
 */
export const buildPayload = (params: BuildPayloadParams): PayloadData => {
  const { data, files, invokeHistory, systemPromptKey } = params;

  const conversationHistories: ConversationHistory[] = [];
  if (invokeHistory) {
    conversationHistories.push(...(invokeHistory.inputs['conversation_histories'] ?? []));

    conversationHistories.push({
      input: JSON.stringify(invokeHistory.inputs),
      output: invokeHistory.outputs,
      createdDate: invokeHistory.createdDate,
    });
  }

  let payload: PayloadData = { ...data };

  if (files.length >= 1) {
    payload = { ...payload, files };
  }

  if (conversationHistories.length >= 1) {
    payload = { ...payload, conversation_histories: conversationHistories };
  }

  if (systemPromptKey && data[systemPromptKey]) {
    const systemPrompt = String(data[systemPromptKey]);
    const placeholderPattern = /\{\{(\w+)\}\}/g;

    const replacedPrompt = systemPrompt.replace(
      placeholderPattern,
      (match, placeholder: string) => {
        const value = data[placeholder];
        if (value !== undefined && value !== null) {
          return String(value);
        }
        return match;
      },
    );

    payload = { ...payload, [systemPromptKey]: replacedPrompt };
  }

  return payload;
};
