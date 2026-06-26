import {
  CreateSystemContextRequest,
  SystemContext,
  UpdateSystemContextTitleResponse,
} from 'genai-web';
import useSWR from 'swr';
import { genUApi, genUApiFetcher } from '@/lib/fetcher';
import { decomposeId } from '@/utils/decomposeId';

export const useSystemContextApi = () => {
  return {
    createSystemContext: async (systemContextTitle: string, systemContext: string) => {
      const res = await genUApi.post<CreateSystemContextRequest>('/systemcontexts', {
        systemContextTitle: systemContextTitle,
        systemContext: systemContext,
      });
      return res.data;
    },
    deleteSystemContext: async (_systemContextId: string) => {
      const systemContextId = decomposeId(_systemContextId);
      return genUApi.delete<void>(`/systemcontexts/${systemContextId}`);
    },
    updateSystemContextTitle: async (_systemContextId: string, title: string) => {
      const systemContextId = decomposeId(_systemContextId);
      const res = await genUApi.put<UpdateSystemContextTitleResponse>(
        `systemcontexts/${systemContextId}/title`,
        {
          title,
        },
      );
      return res.data;
    },
    listSystemContexts: () => {
      return useSWR<SystemContext[]>('/systemcontexts', genUApiFetcher);
    },
  };
};
