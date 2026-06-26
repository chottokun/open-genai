import { useEffect } from 'react';
import { useLocation } from 'react-router';
import { useChat } from '@/hooks/useChat';
import { useShouldResetOnNavigate } from '@/hooks/useShouldResetOnNavigate';
import { useTranslateStore } from '../stores/useTranslateStore';

export const useReset = () => {
  const { shouldReset } = useShouldResetOnNavigate();
  const { clear } = useTranslateStore();
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
