import { ListTeamUsersResponse } from 'genai-web';
import { useSWRConfig } from 'swr';
import { unstable_serialize } from 'swr/infinite';
import { teamApi } from '@/lib/fetcher';

export const useDeleteTeamMember = () => {
  const { mutate } = useSWRConfig();

  return {
    deleteTeamMember: async (teamId: string, userId: string) => {
      const key = unstable_serialize(() => `teams/${teamId}/users`);

      await teamApi.delete(`teams/${teamId}/users/${userId}`);

      await mutate(
        key,
        async (currentData: ListTeamUsersResponse[] | undefined) => {
          if (!currentData) {
            return currentData;
          }

          return currentData.map((page) => ({
            ...page,
            teamUsers: page.teamUsers.filter((user) => user.userId !== userId),
          }));
        },
        { revalidate: false },
      );
    },
  };
};
