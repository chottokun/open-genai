/*
 *  Copyright 2025 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: LicenseRef-.amazon.com.-AmznSL-1.0
 *  Licensed under the Amazon Software License  http://aws.amazon.com/asl/
 */
import { ListExAppsResponse } from 'genai-web';
import { listExApps } from './repository/exAppRepository';
import { findTeamsByIds, listTeamsByUserId } from './repository/teamRepository';
import { COMMON_TEAM_ID } from './utils/constants';
import { createApiHandler } from './utils/createApiHandler';
import { getLimit } from './utils/getLimit';
import { getUserId } from './utils/getUserId';

export const handler = createApiHandler(async (event) => {
  const userId = getUserId(event);
  const limit = getLimit(event);

  const res = await listTeamsByUserId(limit, userId);
  let lastEvaluatedKey = res.lastEvaluatedKey;
  const teamIds = res.teams.map((team) => team.teamId);

  while (lastEvaluatedKey) {
    const next = await listTeamsByUserId(limit, userId, lastEvaluatedKey);
    lastEvaluatedKey = next.lastEvaluatedKey;
    teamIds.push(...next.teams.map((team) => team.teamId));
  }

  if (!teamIds.includes(COMMON_TEAM_ID)) {
    teamIds.push(COMMON_TEAM_ID);
  }

  const teams = await findTeamsByIds(teamIds);

  const results = await Promise.all(
    teams.map(async (team) => {
      if (!team) {
        return [];
      }

      const teamExApps: ListExAppsResponse = [];
      const res = await listExApps(limit, team.teamId);

      if (res.exApps.length > 0) {
        teamExApps.push(
          ...res.exApps.map((exapp) => ({
            ...exapp,
            teamName: team.teamName,
          })),
        );

        let lastEvaluatedKey = res.lastEvaluatedKey;
        while (lastEvaluatedKey) {
          const nextRes = await listExApps(limit, team.teamId, lastEvaluatedKey);
          lastEvaluatedKey = nextRes.lastEvaluatedKey;
          teamExApps.push(
            ...nextRes.exApps.map((exapp) => ({
              ...exapp,
              teamName: team.teamName,
            })),
          );
        }
      }
      return teamExApps;
    }),
  );

  const exApps = results.flat() as ListExAppsResponse;

  if (exApps.length < 1) {
    return { statusCode: 200, body: [] };
  }

  return { statusCode: 200, body: exApps };
});
