import { InvokeExAppRequest, InvokeExAppResponse } from 'genai-web';
import { teamApi } from '@/lib/fetcher';

export const useInvokeExApp = () => {
  const invokeExApp = async (request: InvokeExAppRequest) => {
    const response = await teamApi.post<InvokeExAppResponse>('exapps/invoke', request);
    return response.data;
  };

  return {
    invokeExApp,
  };
};
