import type { ListExAppsResponse } from 'genai-web';
import useSWR from 'swr';
import { teamApiFetcher } from '@/lib/fetcher';

export const useFetchExApps = () => {
  return useSWR<ListExAppsResponse>('exapps', teamApiFetcher, { suspense: true });
};
