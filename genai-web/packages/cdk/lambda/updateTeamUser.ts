/*
 *  Copyright 2025 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: LicenseRef-.amazon.com.-AmznSL-1.0
 *  Licensed under the Amazon Software License  http://aws.amazon.com/asl/
 */
import { GroupName } from 'genai-web';
import { findTeamUserById, listTeamUsers, updateTeamUser } from './repository/teamUserRepository';
import { updateTeamUserSchema } from './schemas/updateTeamUserSchema';
import { addUserToGroup, findUserById, removeUserFromGroup } from './utils/cognitoApi';
import { GROUP_NAME } from './utils/constants';
import { createApiHandler } from './utils/createApiHandler';
import { getLimit } from './utils/getLimit';
import { HttpError } from './utils/httpError';
import { parseRequestBody } from './utils/parseRequestBody';
import { requirePathParam } from './utils/requirePathParam';
import { requireTeamAdminOrSystemAdmin } from './utils/requireTeamAdminOrSystemAdmin';

export const handler = createApiHandler(async (event) => {
  const teamId = requirePathParam(event, 'teamId');
  const userId = requirePathParam(event, 'userId');
  await requireTeamAdminOrSystemAdmin(event, teamId);

  const req = parseRequestBody(updateTeamUserSchema, event.body!);
  const { isAdmin } = req;

  const user = await findUserById(userId);
  if (!user) {
    throw new HttpError(404, '該当ユーザがいません。');
  }

  const userItem = await findTeamUserById(teamId, user.userId!);
  if (!userItem) {
    throw new HttpError(404, '該当ユーザがいません。');
  }

  const limit = getLimit();
  const res = await listTeamUsers(limit, teamId);
  const teamAdmins = res.teamUsers.filter((u) => u.isAdmin);
  let lastEvaluatedKey = res.lastEvaluatedKey;
  while (lastEvaluatedKey) {
    const res = await listTeamUsers(limit, teamId, lastEvaluatedKey);
    teamAdmins.push(...res.teamUsers.filter((u) => u.isAdmin));
    lastEvaluatedKey = res.lastEvaluatedKey;
  }

  if (teamAdmins.length < 2 && !isAdmin) {
    throw new HttpError(400, 'チーム管理者が0人になるため、削除できません。');
  }

  const teamUser = await updateTeamUser(teamId, userId, { isAdmin });

  if (isAdmin) {
    await addUserToGroup(userId, GROUP_NAME.TeamAdminGroup as GroupName);
  } else {
    await removeUserFromGroup(userId, GROUP_NAME.TeamAdminGroup as GroupName);
  }

  return { statusCode: 200, body: teamUser };
});
