import { ListInvokeExAppHistoriesResponse } from 'genai-web';
import useSWRInfinite from 'swr/infinite';
import { teamApiFetcher } from '@/lib/fetcher';

export const getExAppHistoriesKey =
  (teamId: string, exAppId: string) =>
  (pageIndex: number, previousPageData?: ListInvokeExAppHistoriesResponse) => {
    if (previousPageData && !previousPageData.lastEvaluatedKey) {
      return null;
    }

    const params = new URLSearchParams({
      teamId,
      exAppId,
    });

    if (pageIndex > 0 && previousPageData?.lastEvaluatedKey) {
      params.append('exclusiveStartKey', JSON.stringify(previousPageData.lastEvaluatedKey));
    }

    return `exapps/histories?${params.toString()}`;
  };

export const useFetchInvokedExAppHistories = (teamId: string, exAppId: string) => {
  return useSWRInfinite<ListInvokeExAppHistoriesResponse>(
    getExAppHistoriesKey(teamId, exAppId),
    teamApiFetcher,
    {
      revalidateOnFocus: false,
      suspense: true,
    },
  );
};
