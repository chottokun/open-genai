import { APIGatewayProxyEvent } from 'aws-lambda';

export const getQueryParam = (event: APIGatewayProxyEvent, name: string): string | undefined => {
  return event.queryStringParameters?.[name] || undefined;
};
