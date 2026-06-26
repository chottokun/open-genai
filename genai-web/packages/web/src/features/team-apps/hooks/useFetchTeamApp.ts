import { ExApp } from 'genai-web';
import { useParams } from 'react-router';
import useSWR from 'swr';
import { isApiError, teamApiFetcher } from '@/lib/fetcher';

export const useFetchTeamApp = (options?: { suspense?: boolean }) => {
  const { teamId, appId } = useParams();
  const { data, isLoading, error } = useSWR<ExApp>(
    `/teams/${teamId}/exapps/${appId}`,
    teamApiFetcher,
    {
      suspense: options?.suspense,
    },
  );

  return {
    app: data,
    isLoading,
    error:
      error && isApiError(error)
        ? (error.data as { error?: string })?.error
        : JSON.stringify(error),
  };
};
