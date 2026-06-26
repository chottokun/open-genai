import { useEffect, useRef } from 'react';

const START_DELAY_MS = 3000;

/**
 * トップチャットからの初回遷移時にアナウンスの開始を遅延させる。
 * ページタイトル読み上げ（約2-3秒）との競合を避けるため。
 */
export const useChatAnnouncementDelay = ({
  isFromTopChat,
  loading,
  isEmpty,
}: {
  isFromTopChat: boolean;
  loading: boolean;
  isEmpty: boolean;
}) => {
  const isFromTopChatRef = useRef(isFromTopChat);
  const hasCompletedFirstLoadRef = useRef(false);

  useEffect(() => {
    if (!loading && isFromTopChatRef.current && !hasCompletedFirstLoadRef.current && !isEmpty) {
      hasCompletedFirstLoadRef.current = true;
    }
  }, [loading, isEmpty]);

  const isInitialFromTopChat = isFromTopChatRef.current && !hasCompletedFirstLoadRef.current;
  const announcementDelay = isInitialFromTopChat ? START_DELAY_MS : 0;
  return { announcementDelay };
};
