import { useEffect, useRef, useState } from 'react';

type LiveStatusMessages = {
  loading: string;
  loadingContinue: string;
  completed: string;
  error?: string;
  empty?: string;
};

type UseLiveStatusMessageProps = {
  active: boolean;
  loading?: boolean;
  /** 開始アナウンスを遅らせるミリ秒数（ページタイトル読み上げとの競合を避けるため） */
  startDelay?: number;
  messages: LiveStatusMessages;
};

// スクリーンリーダーによるステータス読み上げ用のカスタムフック
// ローディング状態の変化に応じて、aria-live 領域にメッセージを設定します。
export const useLiveStatusMessage = ({
  active,
  loading,
  startDelay = 0,
  messages,
}: UseLiveStatusMessageProps) => {
  const [liveStatusMessage, setLiveStatusMessage] = useState('');

  // NOTE: aria-live属性を使用してスクリーンリーダーに通知するためのタイマーを管理
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // NOTE： 前回のローディング状態を保持するためのref
  // 初期値は false に固定し、loading の変化を正しく検出する
  // （初回レンダリング時に loading が true だと開始アナウンスがスキップされる問題を防ぐ）
  const prevLoadingRef = useRef<boolean>(false);

  // タイマーのクリーンアップ関数
  const clearTimers = () => {
    for (const id of timersRef.current) {
      clearTimeout(id);
    }
    timersRef.current = [];
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  // setTimeout のラッパー（クリーンアップ対象に自動登録）
  const addTimeout = (fn: () => void, ms: number) => {
    const id = setTimeout(fn, ms);
    timersRef.current.push(id);
    return id;
  };

  // メッセージを設定し、5秒後にクリアする共通関数
  const setMessageWithTimeout = (message: string) => {
    setLiveStatusMessage(message);
    addTimeout(() => setLiveStatusMessage(''), 5000);
  };

  // コンポーネントのアンマウント時にすべてのタイマーをクリア
  useEffect(() => {
    return clearTimers;
  }, []);

  const prevActiveRef = useRef<boolean>(false);

  useEffect(() => {
    const wasActive = prevActiveRef.current;
    prevActiveRef.current = active;

    if (!active) {
      if (wasActive) {
        // active が false に切り替わった場合、タイマーを停止しメッセージをクリア
        clearTimers();
        setLiveStatusMessage('');
        prevLoadingRef.current = false;
      }
      return;
    }

    const wasLoading = prevLoadingRef.current;
    prevLoadingRef.current = loading ?? false;

    if (loading && !wasLoading) {
      // ローディング開始時（startDelay が指定されている場合は遅延させる）
      clearTimers();

      const announceStart = () => {
        setMessageWithTimeout(messages.loading);

        // 5秒おきに継続メッセージを繰り返し読み上げ
        // 空文字→100ms後にテキスト設定→2秒後にクリア の流れで
        // aria-live が確実に変化を検知できるようにする
        const announceRepeat = () => {
          setLiveStatusMessage('');
          addTimeout(() => {
            setLiveStatusMessage(messages.loadingContinue);
            addTimeout(() => setLiveStatusMessage(''), 2000);
          }, 100);
        };

        // 5秒後に最初の継続メッセージ、以降5秒間隔で繰り返し
        addTimeout(() => {
          announceRepeat();
          intervalRef.current = setInterval(announceRepeat, 5000);
        }, 5000);
      };

      if (startDelay > 0) {
        addTimeout(announceStart, startDelay);
      } else {
        announceStart();
      }
    } else if (!loading && wasLoading) {
      // ローディング完了時
      clearTimers();

      if (messages.error) {
        setMessageWithTimeout(messages.error);
      } else if (messages.completed) {
        setMessageWithTimeout(messages.completed);
      } else if (messages.empty) {
        setMessageWithTimeout(messages.empty);
      }
    }
    // loading 中の再レンダリングではタイマーをクリアしない（cleanup を返さない）
  }, [loading, active, startDelay, messages]);

  return { liveStatusMessage };
};
