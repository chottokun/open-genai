/*
 *  Copyright 2025 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: LicenseRef-.amazon.com.-AmznSL-1.0
 *  Licensed under the Amazon Software License  http://aws.amazon.com/asl/
 */
import { updateTeam } from './repository/teamRepository';
import { updateTeamSchema } from './schemas/updateTeamSchema';
import { createApiHandler } from './utils/createApiHandler';
import { parseRequestBody } from './utils/parseRequestBody';
import { requirePathParam } from './utils/requirePathParam';
import { requireTeamAdminOrSystemAdmin } from './utils/requireTeamAdminOrSystemAdmin';

export const handler = createApiHandler(async (event) => {
  const teamId = requirePathParam(event, 'teamId');
  await requireTeamAdminOrSystemAdmin(event, teamId);

  const req = parseRequestBody(updateTeamSchema, event.body!);

  const team = await updateTeam(teamId, req.teamName);

  return { statusCode: 200, body: team };
});
