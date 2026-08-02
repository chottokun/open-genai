import useSWR from 'swr';
import { genUApiFetcher } from '@/lib/fetcher';
import { MODELS } from '@/models';

export type DynamicModelMetadata = {
  displayName?: string;
};

export const useAvailableModels = () => {
  const { data, isLoading } = useSWR<{
    textModels: string[];
    imageModels: string[];
    metadata: Record<string, DynamicModelMetadata>;
  }>(
    'models',
    genUApiFetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  );

  return {
    modelIds: data?.textModels ?? MODELS.modelIds,
    imageGenModelIds: data?.imageModels ?? MODELS.imageGenModelIds,
    metadata: data?.metadata ?? {},
    isLoading,
  };
};
