/*
 *  Copyright 2025 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: LicenseRef-.amazon.com.-AmznSL-1.0
 *  Licensed under the Amazon Software License  http://aws.amazon.com/asl/
 */
import { AttributeValue, QueryCommand as DynamoDBQueryCommand } from '@aws-sdk/client-dynamodb';
import { DeleteCommand, PutCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { ExApp, ExAppStatus, UpdateExAppRequest } from 'genai-web';
import { generateExAppId, getExAppId, getTeamId } from '../utils/dynamoEntityKey';
import { dynamoDb, dynamoDbDocument, EXAPP_TABLE_NAME } from './client';

const itemToExApp = (item: Record<string, any>): ExApp => {
  return {
    teamId: item.pk.split('#')[1],
    exAppId: item.sk.split('#')[1],
    endpoint: item.endpoint,
    config: item.config,
    placeholder: item.placeholder,
    systemPrompt: item.systemPrompt,
    systemPromptKeyName: item.systemPromptKeyName,
    exAppName: item.exAppName,
    description: item.description,
    howToUse: item.howToUse,
    apiKey: '', // 値は返さないが、キーだけ入れておく
    copyable: item.copyable,
    status: item.status,
    createdDate: item.createdDate,
    updatedDate: item.updatedDate,
  };
};

export const createExApp = async (params: {
  teamId: string;
  exAppName: string;
  endpoint: string;
  config: string;
  placeholder: string;
  systemPrompt: string;
  systemPromptKeyName: string;
  description: string;
  howToUse: string;
  copyable: boolean;
  status: ExAppStatus;
}): Promise<ExApp> => {
  const now = `${Date.now()}`;
  const teamId = getTeamId(params.teamId);
  const exAppId = generateExAppId();
  const item = {
    pk: teamId,
    sk: exAppId,
    endpoint: params.endpoint,
    exAppName: params.exAppName,
    config: params.config,
    placeholder: params.placeholder,
    systemPrompt: params.systemPrompt,
    systemPromptKeyName: params.systemPromptKeyName,
    description: params.description,
    howToUse: params.howToUse, // Dynamo、usageが予約語で使えなかった
    copyable: params.copyable,
    status: params.status,
    createdDate: now,
    updatedDate: now,
  };

  await dynamoDbDocument.send(
    new PutCommand({
      TableName: EXAPP_TABLE_NAME,
      Item: item,
    }),
  );

  return itemToExApp(item);
};

export const findExAppById = async (_teamId: string, _exAppId: string): Promise<ExApp | null> => {
  const teamId = getTeamId(_teamId);
  const exAppId = getExAppId(_exAppId);
  const res = await dynamoDbDocument.send(
    new QueryCommand({
      TableName: EXAPP_TABLE_NAME,
      KeyConditionExpression: 'pk = :pk AND sk = :sk',
      ExpressionAttributeValues: {
        ':pk': teamId,
        ':sk': exAppId,
      },
    }),
  );

  if (!res.Items || res.Items.length === 0) {
    return null;
  } else {
    return itemToExApp(res.Items[0]);
  }
};

/**
 * ExApp ID からDynamoDB低レベルフォーマット（属性タイプを含む形式）の生データを返す。IDに該当しなければ、nullを返す
 * @param _teamId
 * @param _exAppId
 * @returns DynamoDB低レベルフォーマットのJSONデータ（例: {"S": "value"}, {"N": "123"}）
 */
export const findRawExAppById = async (
  _teamId: string,
  _exAppId: string,
): Promise<Record<string, AttributeValue> | null> => {
  const teamId = getTeamId(_teamId);
  const exAppId = getExAppId(_exAppId);
  const res = await dynamoDb.send(
    new DynamoDBQueryCommand({
      TableName: EXAPP_TABLE_NAME,
      KeyConditionExpression: 'pk = :pk AND sk = :sk',
      ExpressionAttributeValues: {
        ':pk': { S: teamId },
        ':sk': { S: exAppId },
      },
    }),
  );

  if (!res.Items || res.Items.length === 0) {
    return null;
  } else {
    return res.Items[0];
  }
};

export const listExApps = async (
  _limit: number,
  _teamId: string,
  _exclusiveStartKey?: string,
): Promise<{ exApps: ExApp[]; lastEvaluatedKey?: string }> => {
  const teamId = getTeamId(_teamId);
  const exclusiveStartKey = _exclusiveStartKey
    ? JSON.parse(Buffer.from(_exclusiveStartKey, 'base64').toString())
    : undefined;

  const res = await dynamoDbDocument.send(
    new QueryCommand({
      TableName: EXAPP_TABLE_NAME,
      KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)',
      ExpressionAttributeValues: {
        ':pk': teamId,
        ':prefix': 'exapp#',
      },
      ExpressionAttributeNames: {
        '#status': 'status',
      },
      ProjectionExpression:
        'pk, sk, exAppName, description, #status, createdDate, updatedDate, copyable',
      Limit: _limit,
      ExclusiveStartKey: exclusiveStartKey,
    }),
  );

  return {
    exApps: res.Items
      ? res.Items.map((item) => ({
          teamId: item.pk.split('#')[1],
          exAppId: item.sk.split('#')[1],
          endpoint: '',
          config: '',
          placeholder: '',
          systemPrompt: '',
          systemPromptKeyName: '',
          exAppName: item.exAppName,
          description: item.description,
          howToUse: '',
          apiKey: '',
          // copyable は boolean だが、DynamoDB からない場合は undefined になる可能性がある
          copyable: item.copyable ?? false,
          status: item.status,
          createdDate: item.createdDate ?? '',
          updatedDate: item.updatedDate ?? '',
        }))
      : [],
    lastEvaluatedKey: res.LastEvaluatedKey
      ? Buffer.from(JSON.stringify(res.LastEvaluatedKey)).toString('base64')
      : undefined,
  };
};

export const updateExApp = async (
  _teamId: string,
  _exAppId: string,
  updateExAppData: UpdateExAppRequest,
): Promise<ExApp> => {
  const teamId = getTeamId(_teamId);
  const exAppId = getExAppId(_exAppId);
  const {
    exAppName,
    endpoint,
    config,
    placeholder,
    systemPrompt,
    systemPromptKeyName,
    description,
    howToUse,
    copyable,
    status,
  } = updateExAppData;
  let updateExpression = 'set updatedDate = :updatedDate';
  const expressionAttributeNames: { [key: string]: string } = {};
  const expressionAttributeValues: {
    ':updatedDate': string;
    ':exAppName'?: string;
    ':endpoint'?: string;
    ':config'?: string;
    ':placeholder'?: string;
    ':systemPrompt'?: string;
    ':systemPromptKeyName'?: string;
    ':description'?: string;
    ':howToUse'?: string;
    ':copyable'?: boolean;
    ':status'?: string;
  } = {
    ':updatedDate': `${Date.now()}`,
  };

  if (exAppName && exAppName.length > 0) {
    updateExpression += ', exAppName = :exAppName';
    expressionAttributeValues[':exAppName'] = exAppName;
  }

  if (endpoint && endpoint.length > 0) {
    updateExpression += ', endpoint = :endpoint';
    expressionAttributeValues[':endpoint'] = endpoint;
  }

  if (config && config.length > 0) {
    updateExpression += ', config = :config';
    expressionAttributeValues[':config'] = config;
  }

  if (placeholder && placeholder.length > 0) {
    updateExpression += ', placeholder = :placeholder';
    expressionAttributeValues[':placeholder'] = placeholder;
  }

  updateExpression += ', systemPrompt = :systemPrompt';
  expressionAttributeValues[':systemPrompt'] = systemPrompt;

  updateExpression += ', systemPromptKeyName = :systemPromptKeyName';
  expressionAttributeValues[':systemPromptKeyName'] = systemPromptKeyName;

  if (description && description.length > 0) {
    updateExpression += ', description = :description';
    expressionAttributeValues[':description'] = description;
  }

  if (howToUse && howToUse.length > 0) {
    updateExpression += ', howToUse = :howToUse';
    expressionAttributeValues[':howToUse'] = howToUse;
  }

  if (typeof copyable === 'boolean') {
    updateExpression += ', copyable = :copyable';
    expressionAttributeValues[':copyable'] = copyable;
  }

  if (typeof status === 'string' && (status === 'draft' || status === 'published')) {
    updateExpression += ', #status = :status';
    expressionAttributeNames['#status'] = 'status';
    expressionAttributeValues[':status'] = status;
  }

  const res = await dynamoDbDocument.send(
    new UpdateCommand({
      TableName: EXAPP_TABLE_NAME,
      Key: {
        pk: teamId,
        sk: exAppId,
      },
      UpdateExpression: updateExpression,
      ...(Object.keys(expressionAttributeNames).length > 0 && {
        ExpressionAttributeNames: expressionAttributeNames,
      }),
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW',
    }),
  );

  if (res.Attributes == null) {
    throw new Error('Update exapp request was failed');
  }

  return itemToExApp(res.Attributes);
};

export const deleteExApp = async (_teamId: string, _exAppId: string): Promise<void> => {
  const exAppItem = await findExAppById(_teamId, _exAppId);
  await dynamoDbDocument.send(
    new DeleteCommand({
      TableName: EXAPP_TABLE_NAME,
      Key: {
        pk: getTeamId(exAppItem!.teamId),
        sk: getExAppId(exAppItem!.exAppId),
      },
    }),
  );
};
