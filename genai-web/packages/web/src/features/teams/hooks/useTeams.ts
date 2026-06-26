import { useCallback, useMemo } from 'react';
import { isApiError } from '@/lib/fetcher';
import { useFetchTeams } from './useFetchTeams';

export const useTeams = () => {
  const { data, isLoading, isValidating, error, mutate, size, setSize } = useFetchTeams();

  const teams = useMemo(() => {
    if (!data) {
      return [];
    }
    return data.flatMap((page) => page.teams);
  }, [data]);

  const hasMore = useMemo(() => {
    if (!data || data.length === 0) {
      return false;
    }
    const lastPage = data[data.length - 1];
    return !!lastPage.lastEvaluatedKey;
  }, [data]);

  const loadMore = useCallback(() => {
    setSize(size + 1);
  }, [setSize, size]);

  return {
    teams,
    hasMore,
    isLoading,
    isValidating,
    error:
      error && isApiError(error)
        ? (error.data as { error?: string })?.error
        : JSON.stringify(error),
    mutate,
    loadMore,
  };
};
