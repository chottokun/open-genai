import { useCallback, useEffect, useRef, useState } from 'react';

// アクセシビリティ用の読み上げ機能を提供するカスタムフック
// 検索結果やフィルタリング結果などの画面更新をスクリーンリーダーに通知するために使用します。
// LLMの生成する回答の読み上げには useLiveStatusMessage フックを使用してください。
export const useAccessibilityAnnouncer = () => {
  const [announceMessage, setAnnounceMessage] = useState('');

  // タイマー管理用のref
  const clearTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const announceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const announce = useCallback((newMessage: string, announceDelay = 1000) => {
    // 既存のタイマーをクリア
    if (clearTimeoutRef.current) {
      clearTimeout(clearTimeoutRef.current);
    }
    if (announceTimeoutRef.current) {
      clearTimeout(announceTimeoutRef.current);
    }

    // 遅延して読み上げを開始
    announceTimeoutRef.current = setTimeout(() => {
      setAnnounceMessage(newMessage);

      // 5秒後に自動クリア
      clearTimeoutRef.current = setTimeout(() => {
        setAnnounceMessage('');
      }, 5000);
    }, announceDelay);
  }, []);

  const clearAnnounce = useCallback(() => {
    if (clearTimeoutRef.current) {
      clearTimeout(clearTimeoutRef.current);
    }
    if (announceTimeoutRef.current) {
      clearTimeout(announceTimeoutRef.current);
    }
    setAnnounceMessage('');
  }, []);

  // コンポーネントアンマウント時のクリーンアップ
  useEffect(() => {
    return () => {
      clearAnnounce();
    };
  }, [clearAnnounce]);

  return {
    announceMessage,
    announce,
    clearAnnounce,
  };
};
