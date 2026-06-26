import { useEffect } from 'react';
import { useLocation, useNavigationType } from 'react-router';

const MAX_SCROLL_ENTRIES = 50;
const scrollPositions = new Map<string, number>();

const setScrollPosition = (key: string, position: number) => {
  // 既存キーの場合は削除して末尾に再挿入（LRU更新）
  scrollPositions.delete(key);
  scrollPositions.set(key, position);

  // 上限を超えたら最も古いエントリを削除
  if (scrollPositions.size > MAX_SCROLL_ENTRIES) {
    const oldestKey = scrollPositions.keys().next().value;
    if (oldestKey) {
      scrollPositions.delete(oldestKey);
    }
  }
};

export const useScrollRestoration = () => {
  const { key } = useLocation();
  const navigationType = useNavigationType();

  useEffect(() => {
    window.history.scrollRestoration = 'manual';
  }, []);

  // スクロール位置を履歴エントリごとに保存
  useEffect(() => {
    const handler = () => {
      setScrollPosition(key, window.scrollY);
    };
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, [key]);

  useEffect(() => {
    if (navigationType === 'POP') {
      // ブラウザバック/フォワード時はスクロール位置を復元
      const saved = scrollPositions.get(key);
      if (saved !== undefined) {
        window.scrollTo({ top: saved, left: 0, behavior: 'instant' });
        return;
      }
    }
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'instant',
    });
  }, [key, navigationType]);
};
