import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { GenerateImageInterface, GenerateImageRequest } from 'genai-web';
import { resolveAllowedImageModel } from './utils/allowedModels';
import api from './utils/api';
import { HttpError } from './utils/httpError';
import { parseJsonBody } from './utils/parseJsonBody';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const req = parseJsonBody(event.body) as GenerateImageRequest;
    const model = resolveAllowedImageModel(req.model);
    const res = await (api[model.type] as { generateImage: GenerateImageInterface }).generateImage(
      model,
      req.params,
    );

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: res,
      isBase64Encoded: true,
    };
  } catch (error) {
    console.error(error);
    if (error instanceof HttpError) {
      return {
        statusCode: error.statusCode,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: error.message }),
      };
    }
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ error: (error as Error).message }),
    };
  }
};
