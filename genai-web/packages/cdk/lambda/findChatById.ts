import { findChatById } from './repository/chatRepository';
import { createApiHandler } from './utils/createApiHandler';
import { getUserId } from './utils/getUserId';
import { requirePathParam } from './utils/requirePathParam';

export const handler = createApiHandler(async (event) => {
  const userId = getUserId(event);
  const chatId = requirePathParam(event, 'chatId');
  const chat = await findChatById(userId, chatId);

  return { statusCode: 200, body: { chat } };
});
