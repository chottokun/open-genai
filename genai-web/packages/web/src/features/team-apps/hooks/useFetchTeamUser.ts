import { TeamUser } from 'genai-web';
import { useParams } from 'react-router';
import useSWR from 'swr';
import { teamApiFetcher } from '@/lib/fetcher';

export const useFetchTeamUser = (userId: string) => {
  const { teamId } = useParams();
  const { data, isLoading, error } = useSWR<TeamUser>(
    `/teams/${teamId}/users/${userId}`,
    teamApiFetcher,
  );

  return {
    teamUser: data,
    isLoading,
    error,
  };
};
