import { ListTeamsResponse } from 'genai-web';
import { useSWRConfig } from 'swr';
import { unstable_serialize } from 'swr/infinite';
import { teamApi } from '@/lib/fetcher';

export const useDeleteTeam = () => {
  const { mutate } = useSWRConfig();

  return {
    deleteTeam: async (teamId: string) => {
      const key = unstable_serialize(() => `teams`);

      await teamApi.delete(`teams/${teamId}`);

      await mutate(
        key,
        async (currentData: ListTeamsResponse[] | undefined) => {
          if (!currentData) {
            return currentData;
          }

          return currentData.map((page) => ({
            ...page,
            teams: page.teams.filter((team) => team.teamId !== teamId),
          }));
        },
        { revalidate: false },
      );
    },
  };
};
