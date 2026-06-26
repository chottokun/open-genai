import { useAuth } from '@/hooks/useAuth';
import { useFetchTeamUser } from './useFetchTeamUser';

export const useFetchLoginUser = () => {
  const { data: session } = useAuth();

  const loginUserId = (session?.tokens?.idToken?.payload.sub ?? '') as string;
  const { teamUser } = useFetchTeamUser(loginUserId);
  const loginUserGroup = (session?.tokens?.accessToken?.payload['cognito:groups'] ?? '') as string;

  return {
    isSystemAdminGroup: loginUserGroup.includes('SystemAdminGroup'),
    loginUser: teamUser,
  };
};
