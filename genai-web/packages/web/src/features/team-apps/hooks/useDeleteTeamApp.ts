import { ListTeamExAppsResponse } from 'genai-web';
import { useSWRConfig } from 'swr';
import { unstable_serialize } from 'swr/infinite';
import { teamApi } from '@/lib/fetcher';

export const useDeleteTeamApp = () => {
  const { mutate } = useSWRConfig();

  return {
    deleteTeamApp: async (teamId: string, appId: string) => {
      const key = unstable_serialize(() => `teams/${teamId}/exapps`);

      await teamApi.delete<void>(`teams/${teamId}/exapps/${appId}`);

      await mutate(
        key,
        async (currentData: ListTeamExAppsResponse[] | undefined) => {
          if (!currentData) {
            return currentData;
          }

          return currentData.map((page) => ({
            ...page,
            teamExApps: page.teamExApps.filter((app) => app.exAppId !== appId),
          }));
        },
        { revalidate: false },
      );
    },
  };
};
