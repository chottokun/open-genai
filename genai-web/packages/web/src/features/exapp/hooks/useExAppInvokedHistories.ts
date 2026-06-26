import { InvokeExAppHistory } from 'genai-web';
import { useCallback, useMemo } from 'react';
import { useFetchInvokedExAppHistories } from './useFetchInvokedExAppHistories';

export const useExAppInvokedHistories = (teamId: string, exAppId: string) => {
  const { data, isLoading, isValidating, error, mutate, size, setSize } =
    useFetchInvokedExAppHistories(teamId, exAppId);

  const histories = useMemo(() => {
    if (!data) {
      return [];
    }
    return data.flatMap((page) => page.history ?? []);
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

  const latestHistory = useMemo(() => {
    return histories[0] as InvokeExAppHistory | undefined;
  }, [histories]);

  return {
    histories,
    hasMore,
    isLoading,
    isValidating,
    error,
    mutate,
    loadMore,
    latestHistory,
  };
};
