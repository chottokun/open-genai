import { UserType } from '@aws-sdk/client-cognito-identity-provider';

export type User = UserType;

export type GroupName = 'SystemAdminGroup' | 'TeamAdminGroup' | 'UserGroup';

export type Team = {
  teamId: string;
  teamName: string;
  createdDate: string;
  updatedDate: string;
};

export type UpdateTeamRequest = {
  teamName: string;
};

export type CreateTeamRequest = UpdateTeamRequest & {
  teamAdminEmail: string;
};

export type CreateTeamResponse = Team & {
  teamUser: TeamUser;
};

export type UpdateTeamResponse = Team;

export type ListTeamsResponse = {
  teams: Team[];
  lastEvaluatedKey: string | null;
};

export type TeamUser = {
  teamId: string;
  userId: string; // userId that sub is in UserAttributes of UserType
  username: string;
  isAdmin: boolean;
  createdDate: string;
  updatedDate: string;
};

export type ListTeamUsersResponse = {
  teamUsers: TeamUser[];
  lastEvaluatedKey: string | null;
};

export type CreateTeamUserRequest = {
  email: string;
  isAdmin: boolean;
};

export type UpdateTeamUserRequest = {
  isAdmin: boolean;
};
