import { findChatById, setChatTitle } from './repository/chatRepository';
import { updateChatTitleSchema } from './schemas/updateChatTitleSchema';
import { createApiHandler } from './utils/createApiHandler';
import { getUserId } from './utils/getUserId';
import { HttpError } from './utils/httpError';
import { parseRequestBody } from './utils/parseRequestBody';
import { requirePathParam } from './utils/requirePathParam';

export const handler = createApiHandler(async (event) => {
  const userId = getUserId(event);
  const chatId = requirePathParam(event, 'chatId');
  const chatItem = await findChatById(userId, chatId);

  if (!chatItem) {
    throw new HttpError(404, 'チャットが見つかりません。');
  }

  const req = parseRequestBody(updateChatTitleSchema, event.body!);
  const updatedChat = await setChatTitle(chatItem.id, chatItem.createdDate, req.title);

  return { statusCode: 200, body: { chat: updatedChat } };
});
