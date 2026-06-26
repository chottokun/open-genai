import type { GenerateImageParams, GenerateImageResponse, Model } from 'genai-web';
import { genUApi } from '@/lib/fetcher';

export const useGenerateImage = () => {
  return {
    generateImage: async (params: GenerateImageParams, model: Model | undefined) => {
      const response = await genUApi.post<GenerateImageResponse>('/image/generate', {
        model: model,
        params: {
          ...params,
          stylePreset: params.stylePreset === '' ? undefined : params.stylePreset,
          initImage: params.initImage === '' ? undefined : params.initImage?.split(',')[1],
          maskImage: params.maskImage === '' ? undefined : params.maskImage?.split(',')[1],
        },
      });
      return response.data;
    },
  };
};
