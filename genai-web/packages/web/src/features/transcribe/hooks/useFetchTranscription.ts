import type { GetTranscriptionResponse } from 'genai-web';
import useSWR from 'swr';
import { genUApiFetcher, isApiError } from '@/lib/fetcher';
import { useTranscribeStore } from '../stores/useTranscribeStore';

export const useFetchTranscription = () => {
  const { jobName, status, setStatus } = useTranscribeStore();

  const { data, isLoading, error } = useSWR<GetTranscriptionResponse>(
    jobName ? `transcribe/result/${jobName}` : null,
    genUApiFetcher,
    {
      refreshInterval: status === 'COMPLETED' ? 0 : 2000,
      onSuccess: (data) => {
        setStatus(data.status);
      },
    },
  );

  return {
    transcriptData: data,
    isLoading,
    error:
      error && isApiError(error)
        ? (error.data as { error?: string })?.error
        : error
          ? JSON.stringify(error)
          : undefined,
  };
};
