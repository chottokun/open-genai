import { modelNotAllowedMessage } from './allowedModels';
import { streamingChunk } from './streamingChunk';

type StreamFormatter = (message: string) => string;

const defaultFormatter: StreamFormatter = (message) => {
  return streamingChunk({
    text: message,
    stopReason: 'error',
  });
};

export const writeModelNotAllowedStream = (
  responseStream: NodeJS.WritableStream,
  formatter: StreamFormatter = defaultFormatter,
) => {
  responseStream.write(formatter(modelNotAllowedMessage));
  responseStream.end();
};
