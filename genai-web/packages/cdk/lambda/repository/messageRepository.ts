import { BatchWriteCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { RecordedMessage, ToBeRecordedMessage } from 'genai-web';
import { dynamoDbDocument, TABLE_NAME, TTL_DAYS } from './client';

export const listMessages = async (_chatId: string): Promise<RecordedMessage[]> => {
  const chatId = `chat#${_chatId}`;
  const res = await dynamoDbDocument.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: '#id = :id',
      ExpressionAttributeNames: {
        '#id': 'id',
      },
      ExpressionAttributeValues: {
        ':id': chatId,
      },
    }),
  );

  return res.Items as RecordedMessage[];
};

export const batchCreateMessages = async (
  messages: ToBeRecordedMessage[],
  _userId: string,
  _chatId: string,
): Promise<RecordedMessage[]> => {
  const userId = `user#${_userId}`;
  const chatId = `chat#${_chatId}`;
  const createdDate = Date.now();
  const feedback = 'none';
  const expire_at = Math.floor(Date.now() / 1000) + TTL_DAYS * 24 * 60 * 60;

  const items: RecordedMessage[] = messages.map((m: ToBeRecordedMessage, i: number) => {
    return {
      id: chatId,
      createdDate: m.createdDate ?? `${createdDate + i}#0`,
      messageId: m.messageId,
      role: m.role,
      content: m.content,
      trace: m.trace,
      extraData: m.extraData,
      userId,
      feedback,
      usecase: m.usecase,
      llmType: m.llmType ?? '',
      expire_at,
    };
  });
  await dynamoDbDocument.send(
    new BatchWriteCommand({
      RequestItems: {
        [TABLE_NAME]: items.map((m) => {
          return {
            PutRequest: {
              Item: m,
            },
          };
        }),
      },
    }),
  );

  return items;
};
