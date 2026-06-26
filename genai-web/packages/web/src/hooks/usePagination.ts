import { Pagination } from 'genai-web';
import { SWRInfiniteResponse } from 'swr/infinite';

export const usePagination = <T>(swr: SWRInfiniteResponse<Pagination<T>>, pageSize: number) => {
  const { data, size, setSize, error, mutate } = swr;
  const flattenData = data ? data.flatMap((d) => d.data) : [];
  const isLoadingInitialData = !data && !error;
  const isLoadingMore =
    isLoadingInitialData || (size > 0 && data && typeof data[size - 1] === 'undefined');
  const isEmpty = data?.[0]?.data?.length === 0;
  const isReachingEnd =
    isEmpty ||
    (data &&
      (data[data.length - 1]?.data.length < pageSize || !data[data.length - 1]?.lastEvaluatedKey));
  const canLoadMore = !isReachingEnd;

  return {
    data,
    flattenData,
    mutate,
    isLoading: isLoadingMore,
    isReachingEnd,
    canLoadMore,
    loadMore: () => {
      setSize(size + 1);
    },
  };
};
