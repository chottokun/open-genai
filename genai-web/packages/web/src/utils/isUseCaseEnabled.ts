import { HiddenUseCases, HiddenUseCasesKeys } from 'genai-web';

const getHiddenUseCases = (): HiddenUseCases => {
  const raw = import.meta.env.VITE_APP_HIDDEN_USE_CASES;
  if (!raw) return {} as HiddenUseCases;
  try {
    return (JSON.parse(raw) as HiddenUseCases) ?? ({} as HiddenUseCases);
  } catch {
    return {} as HiddenUseCases;
  }
};

const hiddenUseCases: HiddenUseCases = getHiddenUseCases();

export const isUseCaseEnabled = (...useCases: HiddenUseCasesKeys[]): boolean => {
  return useCases.every((useCase) => !hiddenUseCases[useCase]);
};
