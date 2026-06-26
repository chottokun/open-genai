import { findRawExAppById } from './repository/exAppRepository';
import { createApiHandler } from './utils/createApiHandler';
import { HttpError } from './utils/httpError';
import { requirePathParam } from './utils/requirePathParam';
import { requireTeamAdminOrSystemAdmin } from './utils/requireTeamAdminOrSystemAdmin';

export const handler = createApiHandler(async (event) => {
  const teamId = requirePathParam(event, 'teamId');
  const exAppId = requirePathParam(event, 'exAppId');
  await requireTeamAdminOrSystemAdmin(event, teamId);

  const appData = await findRawExAppById(teamId, exAppId);
  if (!appData) {
    throw new HttpError(400, 'AIアプリが見つかりませんでした。');
  }

  return { statusCode: 200, body: appData };
});
