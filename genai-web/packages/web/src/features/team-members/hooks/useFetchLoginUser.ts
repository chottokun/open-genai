import { useParams } from 'react-router';
import { useAuth } from '@/hooks/useAuth';
import { useFetchTeamMember } from './useFetchTeamMember';

export const useFetchLoginUser = () => {
  const { data: session } = useAuth();
  const { teamId } = useParams();

  const loginUserId = (session?.tokens?.idToken?.payload.sub ?? '') as string;
  const { teamMember } = useFetchTeamMember(teamId ?? '', loginUserId);
  const loginUserGroup = (session?.tokens?.accessToken?.payload['cognito:groups'] ?? '') as string;

  return {
    isSystemAdminGroup: loginUserGroup.includes('SystemAdminGroup'),
    loginUser: teamMember,
  };
};
