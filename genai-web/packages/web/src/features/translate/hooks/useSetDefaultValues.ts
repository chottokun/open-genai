import { useEffect } from 'react';
import { useLocation } from 'react-router';
import { useChat } from '@/hooks/useChat';
import { MODELS } from '@/models';
import { LANGUAGES } from '../constants';
import { useTranslateStore } from '../stores/useTranslateStore';
import { TranslatePageQueryParams } from '../types';

export const useSetDefaultValues = () => {
  const { pathname, search } = useLocation();
  const { setSentence, setAdditionalContext, setLanguage } = useTranslateStore();
  const { getModelId, setModelId } = useChat(pathname);
  const { modelIds: availableModels } = MODELS;

  useEffect(() => {
    const modelId = getModelId();
    const defaultModelId = !modelId ? availableModels[0] : modelId;

    if (search !== '') {
      const params = Object.fromEntries(new URLSearchParams(search)) as TranslatePageQueryParams;
      setSentence(params.sentence ?? '');
      setAdditionalContext(params.additionalContext ?? '');
      setLanguage(params.language || LANGUAGES[0]);
      setModelId(availableModels.includes(params.modelId ?? '') ? params.modelId! : defaultModelId);
    } else {
      setModelId(defaultModelId);
    }
  }, [search]);
};
