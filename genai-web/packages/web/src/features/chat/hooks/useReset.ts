import { useEffect } from 'react';
import { useLocation, useParams } from 'react-router';
import { useChat } from '@/hooks/useChat';
import { useFiles } from '@/hooks/useFiles';
import { useShouldResetOnNavigate } from '@/hooks/useShouldResetOnNavigate';
import { useChatStore } from '../stores/useChatStore';

export const useReset = () => {
  const { shouldReset } = useShouldResetOnNavigate();
  const { pathname } = useLocation();
  const { chatId } = useParams();
  const { clear } = useChat(pathname, chatId);
  const { clear: clearFiles } = useFiles(pathname);
  const { setContent, setSystemContextTitle, setHasSent } = useChatStore();

  // eslint-disable-next-line react-hooks/exhaustive-deps -- 関数は毎回新しい参照になるため依存配列から除外
  useEffect(() => {
    if (!shouldReset) {
      return;
    }

    clear();
    clearFiles();
    setContent('');
    setSystemContextTitle('');
    setHasSent(false);
  }, [shouldReset]);
};
