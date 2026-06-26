import { CustomSelect } from '@/components/ui/CustomSelect';
import { useSelectedModel } from '@/hooks/useSelectedModel';
import { findModelDisplayNameByModelId, MODELS } from '@/models';

export const ModelSelector = () => {
  const { selectedModelId, setSelectedModelId } = useSelectedModel();
  const { modelIds: availableModels } = MODELS;

  return (
    <div className='mt-0 flex w-fit items-end justify-start'>
      <CustomSelect
        label='AIモデル：'
        buttonClassName='min-w-[calc(196/16*1rem)]'
        value={selectedModelId}
        onChange={setSelectedModelId}
        options={availableModels.map((m) => {
          return { value: m, label: findModelDisplayNameByModelId(m) };
        })}
      />
    </div>
  );
};
