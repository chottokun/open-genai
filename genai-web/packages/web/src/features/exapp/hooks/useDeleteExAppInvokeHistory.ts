import { InvokeExAppHistory } from 'genai-web';
import { teamApi } from '@/lib/fetcher';

export const useDeleteExAppInvokeHistory = () => {
  const deleteHistory = async (history: InvokeExAppHistory) => {
    await teamApi.delete(
      `/teams/${history.teamId}/exapps/${history.exAppId}/history?createdDate=${history.createdDate}`,
    );
  };

  return {
    deleteHistory,
  };
};
