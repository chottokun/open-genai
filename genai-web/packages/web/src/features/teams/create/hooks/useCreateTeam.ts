import { CreateTeamRequest, CreateTeamResponse } from 'genai-web';
import { useSWRConfig } from 'swr';
import { teamApi } from '@/lib/fetcher';

export const useCreateTeam = () => {
  const { mutate } = useSWRConfig();

  return {
    createTeam: async (req: CreateTeamRequest) => {
      const res = await teamApi.post<CreateTeamResponse>('teams', req);
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
