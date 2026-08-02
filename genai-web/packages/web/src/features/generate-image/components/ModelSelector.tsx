import { CustomSelect } from '@/components/ui/CustomSelect';
import { findModelDisplayNameByModelId, MODELS } from '@/models';
import { useGenerateImageStore } from '../stores/useGenerateImageStore';

export const ModelSelector = () => {
  const { imageGenModelId, setImageGenModelId } = useGenerateImageStore();
  const { imageGenModelIds } = MODELS;

  return (
    <CustomSelect
      label='AIモデル：'
      value={imageGenModelId}
      onChange={setImageGenModelId}
      options={imageGenModelIds.map((m) => ({
        value: m,
        label: findModelDisplayNameByModelId(m),
      }))}
    />
  );
};
