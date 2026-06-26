import { useEffect } from 'react';
import { useLocation } from 'react-router';
import { useChat } from '@/hooks/useChat';
import { useShouldResetOnNavigate } from '@/hooks/useShouldResetOnNavigate';
import { useGenerateImageStore } from '../stores/useGenerateImageStore';

export const useReset = () => {
  const { shouldReset } = useShouldResetOnNavigate();
  const { pathname } = useLocation();
  const { clear: clearChat } = useChat(pathname);
  const { clearImage, clear } = useGenerateImageStore();

  useEffect(() => {
    if (!shouldReset) {
      return;
    }

    clear();
    clearChat();
    clearImage();
  }, [shouldReset]);
};
