import { useEffect } from 'react';
import { useLocation } from 'react-router';
import { useShouldResetOnNavigate } from '@/hooks/useShouldResetOnNavigate';
import { useDiagramStore } from '../stores/useDiagramStore';
import { useDiagram } from './useDiagram';

export const useReset = () => {
  const { shouldReset } = useShouldResetOnNavigate();
  const { clear } = useDiagramStore();
  const { pathname } = useLocation();
  const { clear: clearChat } = useDiagram(pathname);

  useEffect(() => {
    if (!shouldReset) {
      return;
    }

    clear();
    clearChat();
  }, [shouldReset]);
};
