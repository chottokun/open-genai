import { createWithEqualityFn as create } from 'zustand/traditional';
import { LANGUAGES } from '../constants';

type TranslateState = {
  sentence: string;
  additionalContext: string;
  language: string;
};

type TranslateActions = {
  setSentence: (sentence: string) => void;
  setAdditionalContext: (additionalContext: string) => void;
  setLanguage: (language: string) => void;
  clear: () => void;
};

type TranslateStore = TranslateState & TranslateActions;

const initialState: TranslateState = {
  sentence: '',
  additionalContext: '',
  language: LANGUAGES[0],
};

export const useTranslateStore = create<TranslateStore>((set) => ({
  ...initialState,
  setSentence: (sentence) => set({ sentence }),
  setAdditionalContext: (additionalContext) => set({ additionalContext }),
  setLanguage: (language) => set({ language }),
  clear: () => set(initialState),
}));
