import { findChatById } from './repository/chatRepository';
import { listMessages } from './repository/messageRepository';
import { createApiHandler } from './utils/createApiHandler';
import { getUserId } from './utils/getUserId';
import { HttpError } from './utils/httpError';
import { requirePathParam } from './utils/requirePathParam';

export const handler = createApiHandler(async (event) => {
  const userId = getUserId(event);
  const chatId = requirePathParam(event, 'chatId');
  const chat = await findChatById(userId, chatId);

  if (!chat) {
    throw new HttpError(403, 'Forbidden');
  }

  const messages = await listMessages(chatId);

  return { statusCode: 200, body: { messages } };
});
