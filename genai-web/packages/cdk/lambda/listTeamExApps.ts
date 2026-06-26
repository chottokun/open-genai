/*
 *  Copyright 2025 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: LicenseRef-.amazon.com.-AmznSL-1.0
 *  Licensed under the Amazon Software License  http://aws.amazon.com/asl/
 */
import { listExApps } from './repository/exAppRepository';
import { createApiHandler } from './utils/createApiHandler';
import { getLimit } from './utils/getLimit';
import { getQueryParam } from './utils/getQueryParam';
import { requirePathParam } from './utils/requirePathParam';
import { requireTeamAdminOrSystemAdmin } from './utils/requireTeamAdminOrSystemAdmin';

export const handler = createApiHandler(async (event) => {
  const teamId = requirePathParam(event, 'teamId');
  await requireTeamAdminOrSystemAdmin(event, teamId);

  const limit = getLimit(event);
  const exclusiveStartKey = getQueryParam(event, 'exclusiveStartKey');
  const exApps = await listExApps(limit, teamId, exclusiveStartKey);

  return {
    statusCode: 200,
    body: {
      teamExApps: exApps.exApps,
      lastEvaluatedKey: exApps.lastEvaluatedKey,
    },
  };
});
