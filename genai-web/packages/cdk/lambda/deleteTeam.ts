/*
 *  Copyright 2025 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: LicenseRef-.amazon.com.-AmznSL-1.0
 *  Licensed under the Amazon Software License  http://aws.amazon.com/asl/
 */
import { BatchWriteCommand, NativeAttributeValue } from '@aws-sdk/lib-dynamodb';
import { dynamoDbDocument, EXAPP_TABLE_NAME } from './repository/client';
import { transactDeleteItems } from './repository/commonRepository';
import { listExApps } from './repository/exAppRepository';
import { findTeamById } from './repository/teamRepository';
import { listTeamUsers } from './repository/teamUserRepository';
import { deleteApiKey } from './utils/apiKey';
import { createApiHandler } from './utils/createApiHandler';
import { getExAppId, getTeamId, getUserId } from './utils/dynamoEntityKey';
import { getLimit } from './utils/getLimit';
import { requirePathParam } from './utils/requirePathParam';
import { requireSystemAdmin } from './utils/requireSystemAdmin';

type DeleteKey = { Key: Record<string, NativeAttributeValue> };

const APP_ENV = process.env.APP_ENV || '';

const buildTeamDeleteKey = async (teamId: string): Promise<DeleteKey> => {
  const team = await findTeamById(teamId);
  return {
    Key: {
      pk: getTeamId(team!.teamId),
      sk: 'team',
    },
  };
};

const buildAllExAppDeleteKeys = async (teamId: string): Promise<DeleteKey[] | undefined> => {
  const limit = getLimit();

  const first = await listExApps(limit, teamId);
  const exApps = first.exApps;
  let lastKey = first.lastEvaluatedKey;
  while (lastKey) {
    const res = await listExApps(limit, teamId, lastKey);
    exApps.push(...res.exApps);
    lastKey = res.lastEvaluatedKey;
  }

  if (exApps.length === 0) {
    return undefined;
  }

  return exApps.map((exApp) => ({
    Key: {
      pk: getTeamId(exApp.teamId),
      sk: getExAppId(exApp.exAppId),
    },
  }));
};

const buildAllTeamUserDeleteKeys = async (teamId: string): Promise<DeleteKey[] | undefined> => {
  const limit = getLimit();

  const first = await listTeamUsers(limit, teamId);
  const teamUsers = first.teamUsers;
  let lastKey = first.lastEvaluatedKey;
  while (lastKey) {
    const res = await listTeamUsers(limit, teamId, lastKey);
    teamUsers.push(...res.teamUsers);
    lastKey = res.lastEvaluatedKey;
  }

  if (teamUsers.length === 0) {
    return undefined;
  }

  return teamUsers.map((user) => ({
    Key: {
      pk: getTeamId(user.teamId),
      sk: getUserId(user.userId),
    },
  }));
};

// BatchWriteItem は 25件制限
const BATCH_SIZE = 25;
const MAX_RETRIES = 5;

const batchDeleteExApps = async (exAppKeys: DeleteKey[]): Promise<void> => {
  for (let i = 0; i < exAppKeys.length; i += BATCH_SIZE) {
    const batch = exAppKeys.slice(i, i + BATCH_SIZE);
    let deleteRequests = batch.map((item) => ({
      DeleteRequest: {
        Key: item.Key,
      },
    }));

    let retryCount = 0;
    while (deleteRequests.length > 0 && retryCount < MAX_RETRIES) {
      if (retryCount > 0) {
        const delay = 2 ** retryCount * 100;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }

      const result = await dynamoDbDocument.send(
        new BatchWriteCommand({
          RequestItems: {
            [EXAPP_TABLE_NAME]: deleteRequests,
          },
        }),
      );

      const unprocessed = result.UnprocessedItems?.[EXAPP_TABLE_NAME];
      if (!unprocessed || unprocessed.length === 0) {
        deleteRequests = [];
        break;
      }

      deleteRequests = unprocessed as typeof deleteRequests;
      retryCount++;
    }

    if (deleteRequests.length > 0) {
      throw new Error(
        `Failed to delete ${deleteRequests.length} ExApp items after ${MAX_RETRIES} retries`,
      );
    }
  }
};

export const handler = createApiHandler(async (event) => {
  const teamId = requirePathParam(event, 'teamId');
  requireSystemAdmin(event);

  // Team + TeamUser の削除キーを収集（旧テーブル用）
  const transactItems: DeleteKey[] = [await buildTeamDeleteKey(teamId)];

  const teamUserKeys = await buildAllTeamUserDeleteKeys(teamId);
  if (teamUserKeys) {
    transactItems.push(...teamUserKeys);
  }

  // ExApp の削除キーを収集（新テーブル用）
  const exAppKeys = await buildAllExAppDeleteKeys(teamId);

  // ExApp 関連の削除（API Key + 新テーブル）
  if (exAppKeys) {
    await Promise.all(
      exAppKeys.map((item) => deleteApiKey(teamId, (item.Key.sk as string).split('#')[1], APP_ENV)),
    );
    await batchDeleteExApps(exAppKeys);
  }

  // Team + TeamUser の削除（旧テーブル: TABLE_NAME）
  await transactDeleteItems(transactItems);

  return { statusCode: 204, body: '' };
});
