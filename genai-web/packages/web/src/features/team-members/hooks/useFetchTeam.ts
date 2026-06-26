import { Team } from 'genai-web';
import { useParams } from 'react-router';
import useSWR from 'swr';
import { teamApiFetcher } from '@/lib/fetcher';

export const useFetchTeam = (options?: { suspense?: boolean }) => {
  const { teamId } = useParams();
  const { data, isLoading, error } = useSWR<Team>(`/teams/${teamId}`, teamApiFetcher, {
    suspense: options?.suspense,
  });

  return {
    team: data,
    isLoading,
    error,
  };
};
