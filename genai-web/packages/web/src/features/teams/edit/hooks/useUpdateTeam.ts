import { UpdateTeamRequest, UpdateTeamResponse } from 'genai-web';
import { useSWRConfig } from 'swr';
import { teamApi } from '@/lib/fetcher';

export const useUpdateTeam = () => {
  const { mutate } = useSWRConfig();

  return {
    updateTeam: async (teamId: string, req: UpdateTeamRequest) => {
      const res = await teamApi.put<UpdateTeamResponse>(`teams/${teamId}`, req);
      return res.data;
    },
    mutateTeams: async () => {
      await mutate(
        (key) => {
          if (typeof key === 'string') {
            return key.startsWith(`teams`);
          }
          return false;
        },
        undefined,
        { revalidate: true },
      );
    },
  };
};
