import { InvokeInterface, PredictRequest } from 'genai-web';
import { resolveAllowedTextModel } from './utils/allowedModels';
import api from './utils/api';
import { createApiHandler } from './utils/createApiHandler';
import { parseJsonBody } from './utils/parseJsonBody';

export const handler = createApiHandler(async (event) => {
  const req = parseJsonBody(event.body) as PredictRequest;

  const model = resolveAllowedTextModel(req.model);

  const response = await (api[model.type] as { invoke?: InvokeInterface }).invoke?.(
    model,
    req.messages,
    req.id,
  );

  return {
    statusCode: 200,
    body: JSON.stringify(response),
  };
});
