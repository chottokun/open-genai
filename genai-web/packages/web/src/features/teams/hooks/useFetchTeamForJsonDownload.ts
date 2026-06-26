import { teamApi } from '@/lib/fetcher';

export const useFetchTeamForJsonDownload = () => {
  return {
    fetchTeamForJsonDownload: async (teamId: string) => {
      const response = await teamApi.get<string>(`/teams/${teamId}/raw`);
      return response.data;
    },
  };
};
