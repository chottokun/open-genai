import { createSystemContext } from './repository/systemContextRepository';
import { createSystemContextSchema } from './schemas/createSystemContextSchema';
import { createApiHandler } from './utils/createApiHandler';
import { getUserId } from './utils/getUserId';
import { parseRequestBody } from './utils/parseRequestBody';

export const handler = createApiHandler(async (event) => {
  const userId = getUserId(event);
  const req = parseRequestBody(createSystemContextSchema, event.body!);
  const messages = await createSystemContext(userId, req.systemContextTitle, req.systemContext);

  return { statusCode: 200, body: { messages } };
});
