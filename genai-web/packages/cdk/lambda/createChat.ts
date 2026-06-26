import { createChat } from './repository/chatRepository';
import { createApiHandler } from './utils/createApiHandler';
import { getUserId } from './utils/getUserId';

export const handler = createApiHandler(async (event) => {
  const userId = getUserId(event);
  const chat = await createChat(userId);

  return { statusCode: 200, body: { chat } };
});
