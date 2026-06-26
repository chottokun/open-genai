import type { InvokeExAppResponse } from 'genai-web';
import { createWithEqualityFn as create } from 'zustand/traditional';

type ExAppInvokeState = {
  exAppResponse: InvokeExAppResponse | null;
  requestLoading: boolean;
  error: string | null;
};

type ExAppInvokeActions = {
  setExAppResponse: (exAppResponse: InvokeExAppResponse | null) => void;
  setRequestLoading: (loading: boolean) => void;
  setError: (error: Error | null) => void;
  clear: () => void;
};

type ExAppInvokeStore = ExAppInvokeState & ExAppInvokeActions;

const initialState: ExAppInvokeState = {
  exAppResponse: null,
  requestLoading: false,
  error: null,
};

export const useExAppInvokeStore = create<ExAppInvokeStore>((set) => ({
  ...initialState,
  setExAppResponse: (exAppResponse) => set({ exAppResponse }),
  setRequestLoading: (loading) => set({ requestLoading: loading }),
  setError: (error) => set({ error: error ? error.message : null }),
  clear: () => set(initialState),
}));
