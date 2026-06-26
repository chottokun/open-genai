import { useEffect } from 'react';
import { useLocation } from 'react-router';
import { useChat } from '@/hooks/useChat';
import { MODELS } from '@/models';
import { useDiagramStore } from '../stores/useDiagramStore';
import { DiagramPageQueryParams } from '../types';

export const useSetDefaultValues = () => {
  const { setContent } = useDiagramStore();

  const { pathname, search } = useLocation();
  const { setModelId } = useChat(pathname);
  const { modelIds: availableModels } = MODELS;

  useEffect(() => {
    if (!search) {
      setModelId(availableModels[0]);
      return;
    }

    const params = Object.fromEntries(new URLSearchParams(search)) as DiagramPageQueryParams;
    if (params.content) {
      setContent(params.content);
    }

    const modelId = params.modelId;
    if (modelId && availableModels.includes(modelId)) {
      setModelId(modelId);
    } else {
      setModelId(availableModels[0]);
    }
  }, [search]);
};
