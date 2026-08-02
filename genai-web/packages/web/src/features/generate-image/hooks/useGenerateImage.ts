import type { GenerateImageParams, Model } from 'genai-web';
import { genUApi } from '@/lib/fetcher';

// Define a local extended params type to support standard and extra parameters
interface ExtendedGenerateImageParams extends GenerateImageParams {
  quality?: string;
  style?: string;
  extra_body?: Record<string, any>;
}

export const useGenerateImage = () => {
  return {
    generateImage: async (params: ExtendedGenerateImageParams, model: Model | undefined) => {
      const isEdit =
        params.taskType === 'INPAINTING' ||
        params.taskType === 'OUTPAINTING' ||
        params.taskType === 'IMAGE_VARIATION';

      if (isEdit && params.initImage) {
        const formData = new FormData();
        formData.append('model', model?.modelId || 'standard-image-gen');
        formData.append('prompt', params.textPrompt?.[0]?.text || '');
        formData.append('n', '1');
        formData.append('size', `${params.width || 1024}x${params.height || 1024}`);
        formData.append('response_format', 'b64_json');

        const base64ToBlob = (b64: string, mime: string) => {
          const cleanB64 = b64.includes(',') ? b64.split(',')[1] : b64;
          const byteString = atob(cleanB64);
          const ab = new ArrayBuffer(byteString.length);
          const ia = new Uint8Array(ab);
          for (let i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i);
          }
          return new Blob([ab], { type: mime });
        };

        const initBlob = base64ToBlob(params.initImage, 'image/png');
        formData.append('image', initBlob, 'init_image.png');

        if (params.maskImage) {
          const maskBlob = base64ToBlob(params.maskImage, 'image/png');
          formData.append('mask', maskBlob, 'mask_image.png');
        }

        const response = await genUApi.post<string>('/image/edit', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        return response.data;
      } else {
        const response = await genUApi.post<string>('/image/generate', {
          model: model,
          params: {
            ...params,
            stylePreset: params.stylePreset === '' ? undefined : params.stylePreset,
            initImage: params.initImage === '' ? undefined : params.initImage?.split(',')[1],
            maskImage: params.maskImage === '' ? undefined : params.maskImage?.split(',')[1],
          },
        });
        return response.data;
      }
    },
  };
};
