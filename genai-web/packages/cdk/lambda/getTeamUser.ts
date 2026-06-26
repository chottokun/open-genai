import { findTeamById } from './repository/teamRepository';
import { findTeamUserById } from './repository/teamUserRepository';
import { createApiHandler } from './utils/createApiHandler';
import { HttpError } from './utils/httpError';
import { requirePathParam } from './utils/requirePathParam';
import { requireTeamAdminOrSystemAdmin } from './utils/requireTeamAdminOrSystemAdmin';

export const handler = createApiHandler(async (event) => {
  const teamId = requirePathParam(event, 'teamId');
  const userId = requirePathParam(event, 'userId');

  await requireTeamAdminOrSystemAdmin(event, teamId);

  const team = await findTeamById(teamId);
  if (!team) {
    throw new HttpError(400, 'チームが見つかりませんでした。');
  }

  const user = await findTeamUserById(teamId, userId);
  if (!user) {
    throw new HttpError(400, 'ユーザーが見つかりませんでした。');
  }

  return { statusCode: 200, body: user };
});
