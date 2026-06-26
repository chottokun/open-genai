/*
 *  Copyright 2025 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: LicenseRef-.amazon.com.-AmznSL-1.0
 *  Licensed under the Amazon Software License  http://aws.amazon.com/asl/
 */
import { GroupName } from 'genai-web';
import { deleteTeamUser, findTeamUserById, listTeamUsers } from './repository/teamUserRepository';
import { removeUserFromGroup } from './utils/cognitoApi';
import { GROUP_NAME } from './utils/constants';
import { createApiHandler } from './utils/createApiHandler';
import { getLimit } from './utils/getLimit';
import { HttpError } from './utils/httpError';
import { requirePathParam } from './utils/requirePathParam';
import { requireTeamAdminOrSystemAdmin } from './utils/requireTeamAdminOrSystemAdmin';

export const handler = createApiHandler(async (event) => {
  const teamId = requirePathParam(event, 'teamId');
  const userId = requirePathParam(event, 'userId');
  await requireTeamAdminOrSystemAdmin(event, teamId);

  const user = await findTeamUserById(teamId, userId);
  if (!user) {
    throw new HttpError(404, '削除対象のユーザが見つかりませんでした。');
  }

  if (user.isAdmin) {
    const limit = getLimit();

    const res = await listTeamUsers(limit, teamId);
    const teamAdmins = res.teamUsers.filter((u) => u.isAdmin);
    let lastEvaluatedKey = res.lastEvaluatedKey;
    while (lastEvaluatedKey) {
      const res = await listTeamUsers(limit, teamId, lastEvaluatedKey);
      teamAdmins.push(...res.teamUsers.filter((u) => u.isAdmin));
      lastEvaluatedKey = res.lastEvaluatedKey;
    }

    if (teamAdmins.length < 2) {
      throw new HttpError(400, 'チーム管理者が0人になるため、削除できません。');
    }

    if (teamAdmins.find((admin) => admin.userId === userId) != null) {
      await deleteTeamUser(teamId, userId);
      await removeUserFromGroup(userId, GROUP_NAME.TeamAdminGroup as GroupName);
    }
  } else {
    await deleteTeamUser(teamId, userId);
  }

  return { statusCode: 204, body: '' };
});
