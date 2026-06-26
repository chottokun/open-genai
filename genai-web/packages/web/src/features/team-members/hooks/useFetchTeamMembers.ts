import { ListTeamUsersResponse } from 'genai-web';
import { useParams } from 'react-router';
import useSWRInfinite from 'swr/infinite';
import { teamApiFetcher } from '@/lib/fetcher';

export const useFetchTeamMembers = () => {
  const { teamId } = useParams();

  const getKey = (pageIndex: number, previousPageData: ListTeamUsersResponse) => {
    if (previousPageData && !previousPageData.lastEvaluatedKey) {
      return null;
    }

    if (pageIndex === 0) {
      return `teams/${teamId}/users`;
    }

    return `teams/${teamId}/users?exclusiveStartKey=${previousPageData.lastEvaluatedKey}`;
  };

  return useSWRInfinite<ListTeamUsersResponse>(getKey, teamApiFetcher, {
    revalidateOnFocus: false,
    suspense: true,
  });
};
