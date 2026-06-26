import { createWithEqualityFn as create } from 'zustand/traditional';

type GenerateTextState = {
  information: string;
  context: string;
};

type GenerateTextActions = {
  setInformation: (information: string) => void;
  setContext: (context: string) => void;
  clear: () => void;
};

type GenerateTextStore = GenerateTextState & GenerateTextActions;

const initialState: GenerateTextState = {
  information: '',
  context: '',
};

export const useGenerateTextStore = create<GenerateTextStore>((set) => ({
  ...initialState,
  setInformation: (information) => set({ information }),
  setContext: (context) => set({ context }),
  clear: () => set(initialState),
}));
