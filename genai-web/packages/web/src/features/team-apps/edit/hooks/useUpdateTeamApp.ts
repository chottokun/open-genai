import { ExApp, UpdateExAppRequest } from 'genai-web';
import { useParams } from 'react-router';
import { useSWRConfig } from 'swr';
import { teamApi } from '@/lib/fetcher';

export const useUpdateTeamApp = () => {
  const { teamId } = useParams();
  const { mutate } = useSWRConfig();

  return {
    updateTeamApp: async (teamId: string, exAppId: string, req: UpdateExAppRequest) => {
      const res = await teamApi.put<ExApp>(`teams/${teamId}/exapps/${exAppId}`, req);
      return res.data;
    },
    mutateTeamApps: async () => {
      await mutate(
        (key) => {
          if (typeof key === 'string') {
            return key.startsWith(`teams/${teamId}/exapps`);
          }
          return false;
        },
        undefined,
        { revalidate: true },
      );
    },
  };
};
