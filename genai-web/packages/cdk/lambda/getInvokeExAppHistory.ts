import { findExAppById } from './repository/exAppRepository';
import { findInvokeExAppHistory } from './repository/invokeHistoryRepository';
import { findTeamById } from './repository/teamRepository';
import { createApiHandler } from './utils/createApiHandler';
import { getUserId } from './utils/getUserId';
import { HttpError } from './utils/httpError';
import { requireQueryParam } from './utils/requireQueryParam';

export const handler = createApiHandler(async (event) => {
  const teamId = requireQueryParam(event, 'teamId');
  const exAppId = requireQueryParam(event, 'exAppId');
  const createdDate = requireQueryParam(event, 'createdDate');

  const team = await findTeamById(teamId);
  const exApp = await findExAppById(teamId, exAppId);
  if (!team || !exApp) {
    throw new HttpError(400, 'パラメータが不正です。');
  }

  const userId = getUserId(event);
  const response = await findInvokeExAppHistory(teamId, exAppId, userId, createdDate);

  return { statusCode: 200, body: response };
});
