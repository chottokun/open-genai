import { findExAppById } from './repository/exAppRepository';
import { deleteInvokeExAppHistory } from './repository/invokeHistoryRepository';
import { findTeamById } from './repository/teamRepository';
import { createApiHandler } from './utils/createApiHandler';
import { getUserId } from './utils/getUserId';
import { HttpError } from './utils/httpError';
import { requirePathParam } from './utils/requirePathParam';
import { requireQueryParam } from './utils/requireQueryParam';

export const handler = createApiHandler(async (event) => {
  const teamId = requirePathParam(event, 'teamId');
  const exAppId = requirePathParam(event, 'exAppId');
  const createdDate = requireQueryParam(event, 'createdDate');
  const userId = getUserId(event);

  const team = await findTeamById(teamId);
  const exApp = await findExAppById(teamId, exAppId);
  if (!team || !exApp) {
    throw new HttpError(400, 'パラメータが不正です。');
  }

  await deleteInvokeExAppHistory(teamId, exAppId, userId, createdDate);

  return { statusCode: 204, body: '' };
});
