import { useAuth } from '@/hooks/useAuth';

export const useTeamAuth = () => {
  const { data: session } = useAuth();

  const loginUserGroup = (session?.tokens?.accessToken?.payload['cognito:groups'] ?? '') as string;
  const isSystemAdminGroup = loginUserGroup.includes('SystemAdminGroup');

  return { isSystemAdminGroup };
};
