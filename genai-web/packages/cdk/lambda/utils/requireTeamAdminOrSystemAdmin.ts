import { APIGatewayProxyEvent } from 'aws-lambda';
import { HttpError } from './httpError';
import { isSystemAdmin, isTeamAdmin } from './teamRole';

export const requireTeamAdminOrSystemAdmin = async (
  event: APIGatewayProxyEvent,
  teamId: string,
): Promise<void> => {
  if (!(await isTeamAdmin(event, teamId)) && !isSystemAdmin(event)) {
    throw new HttpError(403, '管理者ではないため利用できません。');
  }
};
