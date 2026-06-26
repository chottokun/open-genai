/*
 *  Copyright 2025 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: LicenseRef-.amazon.com.-AmznSL-1.0
 *  Licensed under the Amazon Software License  http://aws.amazon.com/asl/
 */
import { deleteExApp, findExAppById } from './repository/exAppRepository';
import { deleteApiKey } from './utils/apiKey';
import { createApiHandler } from './utils/createApiHandler';
import { HttpError } from './utils/httpError';
import { requirePathParam } from './utils/requirePathParam';
import { requireTeamAdminOrSystemAdmin } from './utils/requireTeamAdminOrSystemAdmin';

const APP_ENV = process.env.APP_ENV || '';

export const handler = createApiHandler(async (event) => {
  const teamId = requirePathParam(event, 'teamId');
  const exAppId = requirePathParam(event, 'exAppId');
  await requireTeamAdminOrSystemAdmin(event, teamId);

  const exApp = await findExAppById(teamId, exAppId);
  if (!exApp) {
    throw new HttpError(404, '削除対象のAIアプリが見つかりませんでした。');
  }

  await deleteExApp(teamId, exAppId);
  await deleteApiKey(teamId, exAppId, APP_ENV);

  return { statusCode: 204, body: '' };
});
