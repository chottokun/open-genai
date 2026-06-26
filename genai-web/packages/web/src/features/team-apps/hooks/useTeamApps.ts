import { useCallback, useMemo } from 'react';
import { isApiError } from '@/lib/fetcher';
import { useFetchTeamApps } from './useFetchTeamApps';

export const useTeamApps = () => {
  const { data, isLoading, isValidating, error, mutate, size, setSize } = useFetchTeamApps();

  // 全てのページのAIアプリを統合
  const apps = useMemo(() => {
    if (!data) {
      return [];
    }
    return data.flatMap((page) => page.teamExApps);
  }, [data]);

  // 次のページが存在するかどうか
  const hasMore = useMemo(() => {
    if (!data || data.length === 0) {
      return false;
    }
    const lastPage = data[data.length - 1];
    return !!lastPage.lastEvaluatedKey;
  }, [data]);

  // 更に読み込む
  const loadMore = useCallback(() => {
    setSize(size + 1);
  }, [setSize, size]);

  return {
    apps,
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
