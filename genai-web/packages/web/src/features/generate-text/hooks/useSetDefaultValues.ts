import { useEffect } from 'react';
import { useLocation } from 'react-router';
import { useChat } from '@/hooks/useChat';
import { MODELS } from '@/models';
import { useGenerateTextStore } from '../stores/useGenerateTextStore';
import { GenerateTextPageQueryParams } from '../types';

export const useSetDefaultValues = () => {
  const { pathname, search } = useLocation();
  const { setInformation, setContext } = useGenerateTextStore();
  const { getModelId, setModelId } = useChat(pathname);
  const { modelIds: availableModels } = MODELS;

  useEffect(() => {
    const modelId = getModelId();
    const defaultModelId = !modelId ? availableModels[0] : modelId;

    if (search !== '') {
      const params = Object.fromEntries(new URLSearchParams(search)) as GenerateTextPageQueryParams;
      setInformation(params.information ?? '');
      setContext(params.context ?? '');

      setModelId(availableModels.includes(params.modelId ?? '') ? params.modelId! : defaultModelId);
    } else {
      setModelId(defaultModelId);
    }
  }, [search]);
};
