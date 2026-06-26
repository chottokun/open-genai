import { CreateExAppRequest, ExApp } from 'genai-web';
import { useParams } from 'react-router';
import { useSWRConfig } from 'swr';
import { teamApi } from '@/lib/fetcher';

export const useCreateTeamApp = () => {
  const { teamId } = useParams();
  const { mutate } = useSWRConfig();

  return {
    createTeamApp: async (teamId: string, req: CreateExAppRequest) => {
      const res = await teamApi.post<ExApp>(`teams/${teamId}/exapps`, req);
      return res.data;
    },
    mutateTeamApps: async () => {
      await mutate((key) => {
        if (typeof key === 'string') {
          return key.startsWith(`teams/${teamId}/exapps`);
        }
        return false;
      });
    },
  };
};
