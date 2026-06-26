import { APIGatewayProxyEvent } from 'aws-lambda';
import { findTeamUserById } from '../repository/teamUserRepository';
import { GROUP_NAME } from './constants';

const getGroups = (event: APIGatewayProxyEvent): string[] => {
  const raw = event.requestContext.authorizer?.claims?.['cognito:groups'];
  if (!raw) {
    return [];
  }
  return String(raw)
    .split(',')
    .map((group) => group.trim())
    .filter(Boolean);
};

export const isSystemAdmin = (event: APIGatewayProxyEvent): boolean => {
  return getGroups(event).includes(GROUP_NAME.SystemAdminGroup);
};

export const isTeamAdmin = async (
  event: APIGatewayProxyEvent,
  teamId: string,
): Promise<boolean> => {
  const userId: string = event.requestContext.authorizer!.claims['sub'];

  const teamUser = await findTeamUserById(teamId, userId);
  if (!teamUser) {
    return false;
  }

  if (!teamUser.isAdmin) {
    return false;
  }

  return getGroups(event).includes(GROUP_NAME.TeamAdminGroup);
};

export const isTeamUser = async (event: APIGatewayProxyEvent, teamId: string): Promise<boolean> => {
  const userId: string = event.requestContext.authorizer!.claims['sub'];

  const teamUser = await findTeamUserById(teamId, userId);
  if (!teamUser) {
    return false;
  }

  return getGroups(event).includes(GROUP_NAME.UserGroup);
};
