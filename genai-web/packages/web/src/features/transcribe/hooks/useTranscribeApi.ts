import {
  GetFileUploadSignedUrlRequest,
  GetFileUploadSignedUrlResponse,
  StartTranscriptionRequest,
  StartTranscriptionResponse,
  UploadAudioRequest,
} from 'genai-web';
import { genUApi, uploadToSignedUrl } from '@/lib/fetcher';

export const useTranscribeApi = () => {
  return {
    getSignedUrl: (req: GetFileUploadSignedUrlRequest) => {
      return genUApi.post<GetFileUploadSignedUrlResponse>('transcribe/url', req);
    },
    startTranscription: async (req: StartTranscriptionRequest) => {
      const res = await genUApi.post<StartTranscriptionResponse>('transcribe/start', req);
      return res.data;
    },
    uploadAudio: (url: string, req: UploadAudioRequest) => {
      return uploadToSignedUrl(url, req.file, 'audio/*');
    },
  };
};
