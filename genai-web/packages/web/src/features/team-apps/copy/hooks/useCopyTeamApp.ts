import { CopyExAppRequest, ExApp } from 'genai-web';
import { useParams } from 'react-router';
import { useSWRConfig } from 'swr';
import { teamApi } from '@/lib/fetcher';

export const useCopyTeamApp = () => {
  const { teamId } = useParams();
  const { mutate } = useSWRConfig();

  return {
    copyTeamApp: async (teamId: string, exAppId: string, req: CopyExAppRequest) => {
      const res = await teamApi.post<ExApp>(`teams/${teamId}/exapps/${exAppId}/copy`, req);
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
