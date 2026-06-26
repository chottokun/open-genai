import { deleteSystemContext } from './repository/systemContextRepository';
import { createApiHandler } from './utils/createApiHandler';
import { getUserId } from './utils/getUserId';
import { requirePathParam } from './utils/requirePathParam';

export const handler = createApiHandler(async (event) => {
  const userId = getUserId(event);
  const systemContextId = requirePathParam(event, 'systemContextId');
  await deleteSystemContext(userId, systemContextId);

  return { statusCode: 204, body: '' };
});
