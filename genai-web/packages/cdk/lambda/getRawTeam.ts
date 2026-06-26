import { findRawTeamById } from './repository/teamRepository';
import { createApiHandler } from './utils/createApiHandler';
import { HttpError } from './utils/httpError';
import { requirePathParam } from './utils/requirePathParam';
import { requireTeamAdminOrSystemAdmin } from './utils/requireTeamAdminOrSystemAdmin';

export const handler = createApiHandler(async (event) => {
  const teamId = requirePathParam(event, 'teamId');
  await requireTeamAdminOrSystemAdmin(event, teamId);

  const teamData = await findRawTeamById(teamId);
  if (!teamData) {
    throw new HttpError(400, 'チームが見つかりませんでした。');
  }

  return { statusCode: 200, body: teamData };
});
