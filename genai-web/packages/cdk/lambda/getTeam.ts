import { findTeamById } from './repository/teamRepository';
import { COMMON_TEAM_ID } from './utils/constants';
import { createApiHandler } from './utils/createApiHandler';
import { HttpError } from './utils/httpError';
import { requirePathParam } from './utils/requirePathParam';
import { requireTeamAdminOrSystemAdmin } from './utils/requireTeamAdminOrSystemAdmin';

export const handler = createApiHandler(async (event) => {
  const teamId = requirePathParam(event, 'teamId');
  if (teamId !== COMMON_TEAM_ID) {
    await requireTeamAdminOrSystemAdmin(event, teamId);
  }

  const team = await findTeamById(teamId);
  if (!team) {
    throw new HttpError(400, 'チームが見つかりませんでした。');
  }

  return { statusCode: 200, body: team };
});
