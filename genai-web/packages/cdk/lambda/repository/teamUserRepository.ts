/*
 *  Copyright 2025 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: LicenseRef-.amazon.com.-AmznSL-1.0
 *  Licensed under the Amazon Software License  http://aws.amazon.com/asl/
 */
import { DeleteCommand, PutCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { TeamUser, UpdateTeamUserRequest } from 'genai-web';
import { getTeamId, getUserId } from '../utils/dynamoEntityKey';
import { dynamoDbDocument, TABLE_NAME } from './client';

const itemToTeamUser = (item: Record<string, any>): TeamUser => {
  return {
    teamId: item.pk.split('#')[1],
    userId: item.sk.split('#')[1],
    username: item.username,
    isAdmin: item.isAdmin,
    createdDate: item.createdDate,
    updatedDate: item.updatedDate,
  };
};

export const createTeamUser = async (
  _teamId: string,
  _userId: string,
  username: string,
  isAdmin: boolean,
): Promise<TeamUser> => {
  const teamId = getTeamId(_teamId);
  const userId = getUserId(_userId);
  const now = `${Date.now()}`;

  const item = {
    pk: teamId,
    sk: userId,
    username,
    isAdmin,
    createdDate: now,
    updatedDate: now,
  };

  await dynamoDbDocument.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: item,
    }),
  );

  return itemToTeamUser(item);
};

export const findTeamUserById = async (
  _teamId: string,
  _userId: string,
): Promise<TeamUser | null> => {
  const teamId = getTeamId(_teamId);
  const userId = getUserId(_userId);

  const res = await dynamoDbDocument.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'pk = :pk AND sk = :sk',
      ExpressionAttributeValues: {
        ':pk': teamId,
        ':sk': userId,
      },
    }),
  );

  if (!res.Items || res.Items.length === 0) {
    return null;
  } else {
    return itemToTeamUser(res.Items[0]);
  }
};

export const listTeamUsers = async (
  _limit: number,
  _teamId: string,
  _exclusiveStartKey?: string,
): Promise<{ teamUsers: TeamUser[]; lastEvaluatedKey?: string }> => {
  const teamId = getTeamId(_teamId);
  const exclusiveStartKey = _exclusiveStartKey
    ? JSON.parse(Buffer.from(_exclusiveStartKey, 'base64').toString())
    : undefined;

  const res = await dynamoDbDocument.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)',
      ExpressionAttributeValues: {
        ':pk': teamId,
        ':prefix': 'user#',
      },
      Limit: _limit,
      ExclusiveStartKey: exclusiveStartKey,
    }),
  );

  const teamUsers: TeamUser[] = [];
  if (res.Items != null && res.Items.length > 0) {
    teamUsers.push(
      ...(await Promise.all(
        res.Items.map(async (item) => {
          const user = itemToTeamUser(item);
          return user;
        }),
      )),
    );
  }

  return {
    teamUsers: teamUsers,
    lastEvaluatedKey: res.LastEvaluatedKey
      ? Buffer.from(JSON.stringify(res.LastEvaluatedKey)).toString('base64')
      : undefined,
  };
};

export const updateTeamUser = async (
  _teamId: string,
  _userId: string,
  updateTeamUserData: UpdateTeamUserRequest,
): Promise<TeamUser> => {
  const user = await findTeamUserById(_teamId, _userId);

  if (!user) {
    throw new Error('ユーザが見つかりませんでした');
  }
  const updateExpression = 'set isAdmin = :isAdmin, updatedDate = :updatedDate';
  const expressionAttributeValues = {
    ':isAdmin': updateTeamUserData.isAdmin,
    ':updatedDate': `${Date.now()}`,
  };
  const res = await dynamoDbDocument.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: {
        pk: getTeamId(user.teamId),
        sk: getUserId(user.userId),
      },
      UpdateExpression: updateExpression,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW',
    }),
  );

  if (res.Attributes == null) {
    throw new Error('Update team user request was failed');
  }

  return itemToTeamUser(res.Attributes);
};

export const deleteTeamUser = async (_teamId: string, _userId: string): Promise<void> => {
  const user = await findTeamUserById(_teamId, _userId);

  if (user) {
    await dynamoDbDocument.send(
      new DeleteCommand({
        TableName: TABLE_NAME,
        Key: {
          pk: getTeamId(user.teamId),
          sk: getUserId(user.userId),
        },
      }),
    );
  }
};
