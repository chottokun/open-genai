import type { ConversationHistory } from '../types';
import { formatFileInfo } from './formatFileInfo';

/**
 * 会話履歴を展開して表示用の文字列にフォーマットする
 * @param conversationHistories - 会話履歴の配列
 * @returns フォーマットされた会話履歴文字列
 */
export const formatConversationHistory = (conversationHistories: ConversationHistory[]): string => {
  return conversationHistories
    .map((history) => {
      const parsedInputs = JSON.parse(history.input);
      return `## 入力

${Object.keys(parsedInputs)
  .filter((key) => key !== 'conversation_histories')
  .map(
    (key) => `${key}: ${key === 'files' ? formatFileInfo(parsedInputs[key]) : parsedInputs[key]}`,
  )
  .join('\n')}

## 出力

${history.output.replace(/\\n/g, '\n')}
`;
    })
    .join('\n');
};
