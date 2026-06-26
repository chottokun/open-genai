import { APIGatewayProxyEvent } from 'aws-lambda';

const DEFAULT_LIMIT = 30;

export const getLimit = (event?: APIGatewayProxyEvent): number => {
  if (!event || !event.queryStringParameters) {
    return DEFAULT_LIMIT;
  }

  const limitParam = event.queryStringParameters['limit'];
  if (!limitParam) {
    return DEFAULT_LIMIT;
  }

  const limit = parseInt(limitParam, 10);
  if (isNaN(limit) || limit <= 0) {
    return DEFAULT_LIMIT;
  }

  return limit;
};
