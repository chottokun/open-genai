import { DeleteCommand, PutCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import * as crypto from 'crypto';
import { SystemContext } from 'genai-web';
import { dynamoDbDocument, TABLE_NAME, TTL_DAYS } from './client';

export const findSystemContextById = async (
  _userId: string,
  _systemContextId: string,
): Promise<SystemContext | null> => {
  const userId = `systemContext#${_userId}`;
  const systemContextId = `systemContext#${_systemContextId}`;
  const res = await dynamoDbDocument.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: '#id = :id',
      FilterExpression: '#systemContextId = :systemContextId',
      ExpressionAttributeNames: {
        '#id': 'id',
        '#systemContextId': 'systemContextId',
      },
      ExpressionAttributeValues: {
        ':id': userId,
        ':systemContextId': systemContextId,
      },
    }),
  );

  if (!res.Items || res.Items.length === 0) {
    return null;
  } else {
    return res.Items[0] as SystemContext;
  }
};

export const listSystemContexts = async (_userId: string): Promise<SystemContext[]> => {
  const userId = `systemContext#${_userId}`;
  const res = await dynamoDbDocument.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: '#id = :id',
      ExpressionAttributeNames: {
        '#id': 'id',
      },
      ExpressionAttributeValues: {
        ':id': userId,
      },
      ScanIndexForward: false,
    }),
  );
  return res.Items as SystemContext[];
};

export const createSystemContext = async (
  _userId: string,
  title: string,
  systemContext: string,
): Promise<SystemContext> => {
  const userId = `systemContext#${_userId}`;
  const systemContextId = `systemContext#${crypto.randomUUID()}`;
  const expire_at = Math.floor(Date.now() / 1000) + TTL_DAYS * 24 * 60 * 60;
  const item = {
    id: userId,
    createdDate: `${Date.now()}`,
    systemContextId: systemContextId,
    systemContext: systemContext,
    systemContextTitle: title,
    expire_at,
  };

  await dynamoDbDocument.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: item,
    }),
  );

  return item;
};

export const updateSystemContextTitle = async (
  _userId: string,
  _systemContextId: string,
  title: string,
): Promise<SystemContext> => {
  const systemContext = await findSystemContextById(_userId, _systemContextId);
  const res = await dynamoDbDocument.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: {
        id: systemContext?.id,
        createdDate: systemContext?.createdDate,
      },
      UpdateExpression: 'set systemContextTitle = :systemContextTitle',
      ExpressionAttributeValues: {
        ':systemContextTitle': title,
      },
      ReturnValues: 'ALL_NEW',
    }),
  );

  return res.Attributes as SystemContext;
};

export const deleteSystemContext = async (
  _userId: string,
  _systemContextId: string,
): Promise<void> => {
  // System Context の削除
  const systemContext = await findSystemContextById(_userId, _systemContextId);
  await dynamoDbDocument.send(
    new DeleteCommand({
      TableName: TABLE_NAME,
      Key: {
        id: systemContext?.id,
        createdDate: systemContext?.createdDate,
      },
    }),
  );
};
