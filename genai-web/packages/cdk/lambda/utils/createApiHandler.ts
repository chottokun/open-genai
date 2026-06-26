import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { createResponse } from './http';
import { HttpError } from './httpError';

export const createApiHandler = (
  fn: (event: APIGatewayProxyEvent) => Promise<{ statusCode: number; body: unknown }>,
) => {
  return async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
      const result = await fn(event);
      const body = typeof result.body === 'string' ? result.body : JSON.stringify(result.body);
      return createResponse(result.statusCode, body);
    } catch (error) {
      console.error(error);
      if (error instanceof HttpError) {
        return createResponse(error.statusCode, JSON.stringify({ error: error.message }));
      }
      return createResponse(
        500,
        JSON.stringify({ error: 'サーバ側でエラーが発生しました。管理者へご連絡ください。' }),
      );
    }
  };
};
