import { APIGatewayProxyEvent } from 'aws-lambda';

export const getUserId = (event: APIGatewayProxyEvent): string => {
  return event.requestContext.authorizer!.claims['sub'];
};
