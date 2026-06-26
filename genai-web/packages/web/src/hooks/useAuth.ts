import useSWR from 'swr';
import { getLocalSession } from '@/local/localAuth';

export const useAuth = () => {
  return useSWR('user', () => {
    // Open GENAI: ローカルではダミーセッションを返す
    return getLocalSession();
  });
};
