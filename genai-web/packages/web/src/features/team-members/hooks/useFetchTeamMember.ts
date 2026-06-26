import { TeamUser } from 'genai-web';
import useSWR from 'swr';
import { teamApiFetcher } from '@/lib/fetcher';

export const useFetchTeamMember = (
  teamId: string,
  userId: string,
  options?: { suspense?: boolean },
) => {
  const { data, isLoading, error } = useSWR<TeamUser>(
    `/teams/${teamId}/users/${userId}`,
    teamApiFetcher,
    {
      suspense: options?.suspense,
    },
  );

  return {
    teamMember: data,
    isLoading,
    error,
  };
};
