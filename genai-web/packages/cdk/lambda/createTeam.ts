import { GroupName } from 'genai-web';
import { createTeam } from './repository/teamRepository';
import { createTeamUser } from './repository/teamUserRepository';
import { createTeamSchema } from './schemas/createTeamSchema';
import { addUserToGroup, findUserByEmail } from './utils/cognitoApi';
import { GROUP_NAME } from './utils/constants';
import { createApiHandler } from './utils/createApiHandler';
import { HttpError } from './utils/httpError';
import { parseRequestBody } from './utils/parseRequestBody';
import { requireSystemAdmin } from './utils/requireSystemAdmin';

export const handler = createApiHandler(async (event) => {
  requireSystemAdmin(event);

  const req = parseRequestBody(createTeamSchema, event.body!);

  const { teamAdminEmail } = req;
  const user = await findUserByEmail(teamAdminEmail);
  if (!user) {
    throw new HttpError(
      404,
      '本環境に未ログインのユーザーです。本環境へのログインをご案内ください。',
    );
  }
  await addUserToGroup(user.userId!, GROUP_NAME.TeamAdminGroup as GroupName);

  const team = await createTeam(req.teamName);

  const teamUser = await createTeamUser(team.teamId, user.userId, user.email, true);

  return { statusCode: 200, body: { ...team, teamUser } };
});
