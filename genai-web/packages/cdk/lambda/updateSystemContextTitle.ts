import { updateSystemContextTitle } from './repository/systemContextRepository';
import { updateSystemContextTitleSchema } from './schemas/updateSystemContextTitleSchema';
import { createApiHandler } from './utils/createApiHandler';
import { getUserId } from './utils/getUserId';
import { parseRequestBody } from './utils/parseRequestBody';
import { requirePathParam } from './utils/requirePathParam';

export const handler = createApiHandler(async (event) => {
  const userId = getUserId(event);
  const systemContextId = requirePathParam(event, 'systemContextId');
  const req = parseRequestBody(updateSystemContextTitleSchema, event.body!);
  const systemContext = await updateSystemContextTitle(userId, systemContextId, req.title);

  return { statusCode: 200, body: { systemContext } };
});
