import { listSystemContexts } from './repository/systemContextRepository';
import { createApiHandler } from './utils/createApiHandler';
import { getUserId } from './utils/getUserId';

export const handler = createApiHandler(async (event) => {
  const userId = getUserId(event);
  const systemContextItems = await listSystemContexts(userId);

  return { statusCode: 200, body: systemContextItems };
});
