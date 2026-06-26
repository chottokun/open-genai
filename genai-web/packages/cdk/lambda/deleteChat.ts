import { deleteChat } from './repository/chatRepository';
import { createApiHandler } from './utils/createApiHandler';
import { getUserId } from './utils/getUserId';
import { requirePathParam } from './utils/requirePathParam';

export const handler = createApiHandler(async (event) => {
  const userId = getUserId(event);
  const chatId = requirePathParam(event, 'chatId');
  await deleteChat(userId, chatId);

  return { statusCode: 204, body: '' };
});
