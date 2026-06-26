import { APIGatewayProxyEvent } from 'aws-lambda';
import { HttpError } from './httpError';

export const requireQueryParam = (event: APIGatewayProxyEvent, name: string): string => {
  const value = event.queryStringParameters?.[name];
  if (!value) {
    throw new HttpError(400, 'パラメータが不正です。');
  }
  return value;
};
