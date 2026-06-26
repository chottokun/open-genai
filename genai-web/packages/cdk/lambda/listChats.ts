import { listChats } from './repository/chatRepository';
import { createApiHandler } from './utils/createApiHandler';
import { getUserId } from './utils/getUserId';

export const handler = createApiHandler(async (event) => {
  const userId = getUserId(event);
  const exclusiveStartKey = event?.queryStringParameters?.exclusiveStartKey;
  const res = await listChats(userId, exclusiveStartKey);

  return { statusCode: 200, body: res };
});
