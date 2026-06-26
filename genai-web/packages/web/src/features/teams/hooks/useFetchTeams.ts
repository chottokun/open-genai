import { ListTeamsResponse } from 'genai-web';
import useSWRInfinite from 'swr/infinite';
import { teamApiFetcher } from '@/lib/fetcher';

export const useFetchTeams = () => {
  const getKey = (pageIndex: number, previousPageData: ListTeamsResponse) => {
    if (previousPageData && !previousPageData.lastEvaluatedKey) {
      return null;
    }

    if (pageIndex === 0) {
      return 'teams';
    }

    return `teams?exclusiveStartKey=${previousPageData.lastEvaluatedKey}`;
  };

  return useSWRInfinite<ListTeamsResponse>(getKey, teamApiFetcher, {
    revalidateOnFocus: false,
    suspense: true,
  });
};
