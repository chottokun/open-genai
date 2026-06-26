import { GroupName } from 'genai-web';
import { createTeamUser } from './repository/teamUserRepository';
import { createTeamUserSchema } from './schemas/createTeamUserSchema';
import { addUserToGroup, findUserByEmail } from './utils/cognitoApi';
import { GROUP_NAME } from './utils/constants';
import { createApiHandler } from './utils/createApiHandler';
import { HttpError } from './utils/httpError';
import { parseRequestBody } from './utils/parseRequestBody';
import { requirePathParam } from './utils/requirePathParam';
import { requireTeamAdminOrSystemAdmin } from './utils/requireTeamAdminOrSystemAdmin';

export const handler = createApiHandler(async (event) => {
  const teamId = requirePathParam(event, 'teamId');
  await requireTeamAdminOrSystemAdmin(event, teamId);

  const req = parseRequestBody(createTeamUserSchema, event.body!);
  const { email, isAdmin } = req;
  const user = await findUserByEmail(email);

  if (!user) {
    throw new HttpError(
      404,
      '本環境に未ログインのユーザーです。本環境にログインするようご案内ください。',
    );
  }

  await addUserToGroup(
    user.userId,
    isAdmin ? (GROUP_NAME.TeamAdminGroup as GroupName) : (GROUP_NAME.UserGroup as GroupName),
  );

  const teamUser = await createTeamUser(teamId, user.userId, user.email, isAdmin);

  return { statusCode: 200, body: teamUser };
});
