import type { InvokeExAppRequest } from 'genai-web';
import { isApiError } from '@/lib/fetcher';
import { useExAppInvokeStore } from '../stores/useExAppInvokeStore';
import { useInvokeExApp } from './useInvokeExApp';

export const useExAppInvokeState = () => {
  const { invokeExApp } = useInvokeExApp();
  const store = useExAppInvokeStore();

  const invokeRequest = async (req: InvokeExAppRequest) => {
    try {
      const res = await invokeExApp(req);
      store.setExAppResponse(res);
    } catch (error: unknown) {
      store.setExAppResponse(null);
      if (isApiError(error)) {
        throw new Error((error.data as { outputs?: string })?.outputs);
      } else if (error instanceof Error) {
        throw new Error(error.message);
      }
    }
  };

  return {
    ...store,
    invokeRequest,
  };
};
