/*
 *  Copyright 2025 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: LicenseRef-.amazon.com.-AmznSL-1.0
 *  Licensed under the Amazon Software License  http://aws.amazon.com/asl/
 */
import { Team } from 'genai-web';
import { findTeamById, listTeamIdByAdminId, listTeams } from './repository/teamRepository';
import { createApiHandler } from './utils/createApiHandler';
import { getLimit } from './utils/getLimit';
import { getQueryParam } from './utils/getQueryParam';
import { getUserId } from './utils/getUserId';
import { HttpError } from './utils/httpError';
import { isSystemAdmin } from './utils/teamRole';

export const handler = createApiHandler(async (event) => {
  const limit = getLimit(event);
  const userId = getUserId(event);
  const exclusiveStartKey = getQueryParam(event, 'exclusiveStartKey');
  const teamNameFilter = getQueryParam(event, 'name');

  const teams: Team[] = [];
  let lastEvaluatedKey: string | undefined;

  if (isSystemAdmin(event)) {
    const res = await listTeams(limit, exclusiveStartKey, teamNameFilter);
    teams.push(...res.teams);
    lastEvaluatedKey = res.lastEvaluatedKey;
  } else {
    const res = await listTeamIdByAdminId(limit, userId, exclusiveStartKey, teamNameFilter);
    const teamIds = res.teamIds;
    lastEvaluatedKey = res.lastEvaluatedKey;

    if (teamIds.length === 0) {
      throw new HttpError(403, '管理者ではないため利用できません。');
    }

    const resListTeams = await Promise.all(teamIds.map((teamId) => findTeamById(teamId)));
    teams.push(...resListTeams.filter((team) => team != null));
  }

  return { statusCode: 200, body: { teams, lastEvaluatedKey } };
});
