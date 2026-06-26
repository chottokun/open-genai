import { useCallback, useMemo } from 'react';
import { isApiError } from '@/lib/fetcher';
import { useFetchTeamMembers } from './useFetchTeamMembers';

export const useTeamMembers = () => {
  const { data, isLoading, isValidating, error, mutate, size, setSize } = useFetchTeamMembers();

  const members = useMemo(() => {
    if (!data) {
      return [];
    }
    return data.flatMap((page) => page.teamUsers);
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
    members,
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
