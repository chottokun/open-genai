import { useCallback, useEffect, useRef, useState } from 'react';
import { useScreen } from './useScreen';

export const useFollow = () => {
  const { isAtBottom, scrollToBottom } = useScreen();

  // スクロールされる要素が含まれる要素
  // サイズが動的に変更されることが想定される
  // チャットのページであればメッセージを wrap した要素
  // callback ref パターンで DOM 要素のマウントを検知する
  const [scrollableElement, setScrollableElement] = useState<HTMLDivElement | null>(null);

  const scrollableContainerRef = useCallback((node: HTMLDivElement | null) => {
    setScrollableElement(node);
  }, []);

  // フォローするか否か
  // 初期値は false にし、ユーザーのアクション（フォーム送信等）で明示的に true にする
  // これにより、ページ遷移直後に ResizeObserver が scrollToBottom を呼ぶのを防ぐ
  const [following, setFollowing] = useState(false);

  // scrollableElement のサイズ変更を監視
  useEffect(() => {
    if (!scrollableElement) return;

    const observer = new ResizeObserver(() => {
      // 画面サイズ変更されたらフォローする
      if (following) {
        scrollToBottom();
      }
    });

    observer.observe(scrollableElement);

    return () => {
      observer.disconnect();
    };
  }, [scrollableElement, following, scrollToBottom]);

  // フォロー中にユーザーが最下部から離れた場合（true → false）のみ following を解除する
  // setFollowing(true) 直後に isAtBottom が false でも即解除しないよう、
  // 直前の isAtBottom を保持して遷移を検出する
  const prevIsAtBottomRef = useRef(isAtBottom);
  useEffect(() => {
    if (following && prevIsAtBottomRef.current && !isAtBottom) {
      setFollowing(false);
    }
    prevIsAtBottomRef.current = isAtBottom;
  }, [isAtBottom, following]);

  return {
    setFollowing,
    scrollableContainer: scrollableContainerRef,
  };
};
