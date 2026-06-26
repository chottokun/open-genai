import { ListTeamExAppsResponse } from 'genai-web';
import { useParams } from 'react-router';
import useSWRInfinite from 'swr/infinite';
import { teamApiFetcher } from '@/lib/fetcher';

export const useFetchTeamApps = () => {
  const { teamId } = useParams();

  const getKey = (pageIndex: number, previousPageData: ListTeamExAppsResponse) => {
    if (previousPageData && !previousPageData.lastEvaluatedKey) {
      return null;
    }

    if (pageIndex === 0) {
      return `teams/${teamId}/exapps`;
    }

    return `teams/${teamId}/exapps?exclusiveStartKey=${previousPageData.lastEvaluatedKey}`;
  };

  return useSWRInfinite<ListTeamExAppsResponse>(getKey, teamApiFetcher, {
    revalidateOnFocus: false,
    suspense: true,
  });
};
