/*
 *  Copyright 2025 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: LicenseRef-.amazon.com.-AmznSL-1.0
 *  Licensed under the Amazon Software License  http://aws.amazon.com/asl/
 */
import { findExAppById } from './repository/exAppRepository';
import { listInvokeExAppHistories } from './repository/invokeHistoryRepository';
import { findTeamById } from './repository/teamRepository';
import { createApiHandler } from './utils/createApiHandler';
import { getQueryParam } from './utils/getQueryParam';
import { getUserId } from './utils/getUserId';
import { HttpError } from './utils/httpError';
import { requireQueryParam } from './utils/requireQueryParam';

export const handler = createApiHandler(async (event) => {
  const teamId = requireQueryParam(event, 'teamId');
  const exAppId = requireQueryParam(event, 'exAppId');

  const team = await findTeamById(teamId);
  const exApp = await findExAppById(teamId, exAppId);
  if (!team || !exApp) {
    throw new HttpError(400, 'パラメータが不正です。');
  }

  const userId = getUserId(event);
  const exclusiveStartKeyParam = getQueryParam(event, 'exclusiveStartKey');
  const exclusiveStartKey = exclusiveStartKeyParam ? JSON.parse(exclusiveStartKeyParam) : null;

  const response = await listInvokeExAppHistories(teamId, exAppId, userId, exclusiveStartKey);

  return { statusCode: 200, body: response };
});
