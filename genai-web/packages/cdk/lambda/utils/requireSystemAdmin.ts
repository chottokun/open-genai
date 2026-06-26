import { APIGatewayProxyEvent } from 'aws-lambda';
import { HttpError } from './httpError';
import { isSystemAdmin } from './teamRole';

export const requireSystemAdmin = (event: APIGatewayProxyEvent): void => {
  if (!isSystemAdmin(event)) {
    throw new HttpError(403, '管理者ではないため利用できません。');
  }
};
