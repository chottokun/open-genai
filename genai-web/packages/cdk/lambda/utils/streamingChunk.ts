import { StreamingChunk } from 'genai-web';

// JSONL 形式
export const streamingChunk = (chunk: StreamingChunk): string => {
  return JSON.stringify(chunk) + '\n';
};
