import { findExAppById } from './repository/exAppRepository';
import { findTeamById } from './repository/teamRepository';
import { COMMON_TEAM_ID } from './utils/constants';
import { createApiHandler } from './utils/createApiHandler';
import { HttpError } from './utils/httpError';
import { requirePathParam } from './utils/requirePathParam';
import { isSystemAdmin, isTeamUser } from './utils/teamRole';

export const handler = createApiHandler(async (event) => {
  const teamId = requirePathParam(event, 'teamId');
  const exAppId = requirePathParam(event, 'exAppId');

  const team = await findTeamById(teamId);
  if (!team) {
    throw new HttpError(400, 'チームが見つかりませんでした。');
  }

  if (!isSystemAdmin(event) && teamId !== COMMON_TEAM_ID) {
    const isTeamUserResult = await isTeamUser(event, teamId);
    if (!isTeamUserResult) {
      throw new HttpError(403, 'チームメンバーではないため利用できません。');
    }
  }

  const exApp = await findExAppById(teamId, exAppId);
  if (!exApp) {
    throw new HttpError(400, 'AIアプリが見つかりませんでした。');
  }

  return { statusCode: 200, body: exApp };
});
