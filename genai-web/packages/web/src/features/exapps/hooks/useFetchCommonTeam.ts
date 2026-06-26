import type { Team } from 'genai-web';
import useSWR from 'swr';
import { teamApiFetcher } from '@/lib/fetcher';
import { COMMON_EXAPPS_TEAM_ID } from '../constants';

export const useFetchCommonTeam = () => {
  const { data, isLoading, error } = useSWR<Team>(
    `/teams/${COMMON_EXAPPS_TEAM_ID}`,
    teamApiFetcher,
  );

  return {
    commonTeamExists: !error && !!data,
    isLoading,
  };
};
