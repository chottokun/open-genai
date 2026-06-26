import { teamApi } from '@/lib/fetcher';

export const useFetchTeamAppForJsonDownload = () => {
  return {
    fetchTeamAppForJsonDownload: async (teamId: string, appId: string) => {
      const response = await teamApi.get<string>(`/teams/${teamId}/exapps/${appId}/raw`);
      return response.data;
    },
  };
};
