import { AttributeValue } from '@aws-sdk/client-dynamodb';
import { TransactWriteCommand, TransactWriteCommandInput } from '@aws-sdk/lib-dynamodb';
import { dynamoDbDocument, TABLE_NAME } from './client';

const BATCH_SIZE = 100;

export const transactDeleteItems = async (
  keys: { Key: Record<string, AttributeValue> }[],
): Promise<void> => {
  for (let i = 0; i < keys.length; i += BATCH_SIZE) {
    const batch = keys.slice(i, i + BATCH_SIZE);
    const transactWriteItems = batch.map((key) => {
      return {
        Delete: {
          TableName: TABLE_NAME,
          Key: key.Key,
        },
      };
    });

    const command = new TransactWriteCommand({
      TransactItems: transactWriteItems,
    } as TransactWriteCommandInput);
    await dynamoDbDocument.send(command);
  }
};
