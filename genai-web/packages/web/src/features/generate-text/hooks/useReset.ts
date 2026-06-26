import { useEffect } from 'react';
import { useLocation } from 'react-router';
import { useChat } from '@/hooks/useChat';
import { useShouldResetOnNavigate } from '@/hooks/useShouldResetOnNavigate';
import { useGenerateTextStore } from '../stores/useGenerateTextStore';

export const useReset = () => {
  const { shouldReset } = useShouldResetOnNavigate();
  const { clear } = useGenerateTextStore();
  const { pathname } = useLocation();
  const { clear: clearChat } = useChat(pathname);

  useEffect(() => {
    if (!shouldReset) {
      return;
    }

    clear();
    clearChat();
  }, [shouldReset]);
};
