/*
 *  Copyright 2025 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: LicenseRef-.amazon.com.-AmznSL-1.0
 *  Licensed under the Amazon Software License  http://aws.amazon.com/asl/
 */
import { AttributeValue, QueryCommand as DynamoDBQueryCommand } from '@aws-sdk/client-dynamodb';
import { BatchGetCommand, PutCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { Team } from 'genai-web';
import { generateTeamId, getTeamId, getUserId } from '../utils/dynamoEntityKey';
import { dynamoDb, dynamoDbDocument, TABLE_NAME } from './client';

const itemToTeam = (item: Record<string, any>): Team => {
  return {
    teamId: item.pk.split('#')[1],
    teamName: item.teamName,
    createdDate: item.createdDate,
    updatedDate: item.updatedDate,
  };
};

export const createTeam = async (_teamName: string): Promise<Team> => {
  const teamId = generateTeamId();
  const now = `${Date.now()}`;
  const item = {
    pk: teamId,
    sk: 'team',
    teamName: _teamName,
    createdDate: now,
    updatedDate: now,
  };

  await dynamoDbDocument.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: item,
    }),
  );

  return itemToTeam(item);
};

export const findTeamById = async (_teamId: string): Promise<Team | null> => {
  const teamId = getTeamId(_teamId);
  const res = await dynamoDbDocument.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'pk = :pk AND sk = :sk',
      ExpressionAttributeValues: {
        ':pk': teamId,
        ':sk': 'team',
      },
    }),
  );

  if (!res.Items || res.Items.length === 0) {
    return null;
  } else {
    return itemToTeam(res.Items[0]);
  }
};

export const findRawTeamById = async (
  _teamId: string,
): Promise<Record<string, AttributeValue> | null> => {
  const teamId = getTeamId(_teamId);
  const res = await dynamoDb.send(
    new DynamoDBQueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'pk = :pk AND sk = :sk',
      ExpressionAttributeValues: {
        ':pk': { S: teamId },
        ':sk': { S: 'team' },
      },
    }),
  );

  if (!res.Items || res.Items.length === 0) {
    return null;
  } else {
    return res.Items[0];
  }
};

export const findTeamsByIds = async (_teamIds: string[]): Promise<Team[]> => {
  if (_teamIds.length === 0) {
    return [];
  }

  const chunkSize = 100;
  const chunks = [];
  for (let i = 0; i < _teamIds.length; i += chunkSize) {
    chunks.push(_teamIds.slice(i, i + chunkSize));
  }

  const teams: Team[] = [];

  for (const chunk of chunks) {
    const keys = chunk.map((teamId) => ({
      pk: getTeamId(teamId),
      sk: 'team',
    }));

    const res = await dynamoDbDocument.send(
      new BatchGetCommand({
        RequestItems: {
          [TABLE_NAME]: {
            Keys: keys,
          },
        },
      }),
    );

    if (res.Responses && res.Responses[TABLE_NAME]) {
      teams.push(...res.Responses[TABLE_NAME].map((item: any) => itemToTeam(item)));
    }
  }

  return teams;
};

export const listTeams = async (
  _limit: number,
  _exclusiveStartKey?: string,
  _teamNameFilter?: string,
): Promise<{ teams: Team[]; lastEvaluatedKey?: string }> => {
  const exclusiveStartKey = _exclusiveStartKey
    ? JSON.parse(Buffer.from(_exclusiveStartKey, 'base64').toString())
    : undefined;

  const expressionAttributeValues: {
    ':prefix': string;
    ':sk': string;
    ':teamNameFilter'?: string;
  } = {
    ':prefix': 'team#',
    ':sk': 'team',
  };

  let filterExpression: string | undefined;

  if (_teamNameFilter && _teamNameFilter.length > 0) {
    filterExpression = 'contains(teamName, :teamNameFilter)';
    expressionAttributeValues[':teamNameFilter'] = _teamNameFilter;
  }

  const res = await dynamoDbDocument.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'GSI-1',
      KeyConditionExpression: 'sk = :sk AND begins_with(pk, :prefix)',
      ExpressionAttributeValues: expressionAttributeValues,
      ...(filterExpression && { FilterExpression: filterExpression }),
      Limit: _limit,
      ExclusiveStartKey: exclusiveStartKey,
    }),
  );

  return {
    teams: res.Items ? res.Items.map((item) => itemToTeam(item)) : [],
    lastEvaluatedKey: res.LastEvaluatedKey
      ? Buffer.from(JSON.stringify(res.LastEvaluatedKey)).toString('base64')
      : undefined,
  };
};

export const listTeamIdByAdminId = async (
  _limit: number,
  _adminId: string,
  _exclusiveStartKey?: string,
  _teamNameFilter?: string,
): Promise<{ teamIds: string[]; lastEvaluatedKey?: string }> => {
  const exclusiveStartKey = _exclusiveStartKey
    ? JSON.parse(Buffer.from(_exclusiveStartKey, 'base64').toString())
    : undefined;

  const expressionAttributeValues: {
    ':prefix': string;
    ':sk': string;
    ':teamNameFilter'?: string;
  } = {
    ':prefix': 'team#',
    ':sk': getUserId(_adminId),
  };

  let filterExpression: string | undefined;

  if (_teamNameFilter && _teamNameFilter.length > 0) {
    filterExpression = 'contains(teamName, :teamNameFilter)';
    expressionAttributeValues[':teamNameFilter'] = _teamNameFilter;
  }

  const res = await dynamoDbDocument.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'GSI-1',
      KeyConditionExpression: 'sk = :sk AND begins_with(pk, :prefix)',
      ExpressionAttributeValues: expressionAttributeValues,
      ...(filterExpression && { FilterExpression: filterExpression }),
      Limit: _limit,
      ExclusiveStartKey: exclusiveStartKey,
    }),
  );
  const teamAdmins = res.Items ? res.Items.filter((item) => item.isAdmin) : [];

  return {
    teamIds: teamAdmins ? teamAdmins.map((item) => item.pk.split('#')[1]) : [],
    lastEvaluatedKey: res.LastEvaluatedKey
      ? Buffer.from(JSON.stringify(res.LastEvaluatedKey)).toString('base64')
      : undefined,
  };
};

export const updateTeam = async (_teamId: string, _teamName: string): Promise<Team> => {
  const teamId = getTeamId(_teamId);

  const res = await dynamoDbDocument.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: {
        pk: teamId,
        sk: 'team',
      },
      UpdateExpression: 'set teamName = :teamName, updatedDate = :updatedDate',
      ExpressionAttributeValues: {
        ':teamName': _teamName,
        ':updatedDate': Date.now(),
      },
      ReturnValues: 'ALL_NEW',
    }),
  );

  if (res.Attributes == null) {
    throw new Error('Update team request was failed');
  }

  return itemToTeam(res.Attributes);
};

export const listTeamsByUserId = async (
  _limit: number,
  _userId: string,
  _exclusiveStartKey?: string,
): Promise<{ teams: Team[]; lastEvaluatedKey?: string }> => {
  const userId = getUserId(_userId);
  const exclusiveStartKey = _exclusiveStartKey
    ? JSON.parse(Buffer.from(_exclusiveStartKey, 'base64').toString())
    : undefined;

  const res = await dynamoDbDocument.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'GSI-1',
      KeyConditionExpression: 'sk = :sk AND begins_with(pk, :prefix)',
      ExpressionAttributeValues: {
        ':prefix': 'team#',
        ':sk': userId,
      },
      Limit: _limit,
      ExclusiveStartKey: exclusiveStartKey,
    }),
  );

  const teams: Team[] = [];
  if (res.Items != null && res.Items.length > 0) {
    teams.push(...res.Items.map((item) => itemToTeam(item)));
  }

  return {
    teams: teams,
    lastEvaluatedKey: res.LastEvaluatedKey
      ? Buffer.from(JSON.stringify(res.LastEvaluatedKey)).toString('base64')
      : undefined,
  };
};
