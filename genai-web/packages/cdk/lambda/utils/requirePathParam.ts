import { APIGatewayProxyEvent } from 'aws-lambda';
import { HttpError } from './httpError';

export const requirePathParam = (event: APIGatewayProxyEvent, name: string): string => {
  const value = event.pathParameters?.[name];
  if (!value) {
    throw new HttpError(400, 'パラメータが不正です。');
  }
  return value;
};
