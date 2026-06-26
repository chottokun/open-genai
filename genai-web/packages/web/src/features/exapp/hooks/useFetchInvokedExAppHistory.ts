import { GetInvokeExAppHistoryResponse, InvokeExAppHistory } from 'genai-web';
import { teamApi } from '@/lib/fetcher';

export const useFetchExAppHistory = () => {
  const fetchExAppHistory = async (history: InvokeExAppHistory) => {
    const q = new URLSearchParams({
      teamId: history.teamId,
      exAppId: history.exAppId,
      createdDate: history.createdDate,
    }).toString();

    const res = await teamApi.get<GetInvokeExAppHistoryResponse>(`/exapps/history?${q}`);
    const updatedHistory = res.data.history;

    return updatedHistory;
  };

  return {
    fetchExAppHistory,
  };
};
