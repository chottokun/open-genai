import { useMemo } from 'react';
import { FILE_LIMIT } from '@/features/chat/constants';
import { useSelectedModel } from '@/hooks/useSelectedModel';
import { MODELS } from '@/models';

export const useFileUploadable = () => {
  // Open GENAI: 添付可否は「AIモデル」ドロップダウンで選択中のモデルに連動させる
  // （生成時に参照するモデルと一致させるため）。
  const { selectedModelId } = useSelectedModel();

  const modelId = selectedModelId;

  const accept = useMemo(() => {
    if (!modelId) {
      return [];
    }

    const feature = MODELS.modelMetadata[modelId]?.flags;
    if (!feature) {
      return [];
    }
    return [
      ...(feature.doc ? FILE_LIMIT.accept.doc : []),
      ...(feature.image ? FILE_LIMIT.accept.image : []),
      ...(feature.video ? FILE_LIMIT.accept.video : []),
    ];
  }, [modelId]);

  const fileUploadable = accept.length > 0;

  return {
    accept,
    fileUploadable,
  };
};
