import { ExApp } from 'genai-web';
import useSWR from 'swr';
import { isApiError, teamApiFetcher } from '@/lib/fetcher';

export const useFetchExApp = (teamId: string, exAppId: string) => {
  const { data, isLoading, error } = useSWR<ExApp>(
    `/teams/${teamId}/exapps/${exAppId}`,
    teamApiFetcher,
  );

  return {
    data,
    isLoading,
    error:
      error && isApiError(error)
        ? (error.data as { error?: string })?.error
        : JSON.stringify(error),
  };
};
