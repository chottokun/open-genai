import { useLocalStorage } from '@/hooks/useLocalStorage';
import { MODELS } from '@/models';

export const useSelectedModel = () => {
  const [modelId, setModelId] = useLocalStorage('modelId_v20260218', '');
  const { modelIds: availableModels } = MODELS;

  const hasModelId = availableModels.includes(modelId);

  return {
    selectedModelId: hasModelId && modelId.length !== 0 ? modelId : availableModels[0],
    setSelectedModelId: (id: string) => {
      setModelId(id);
    },
  };
};
