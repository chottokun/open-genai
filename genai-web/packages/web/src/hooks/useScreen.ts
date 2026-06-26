import { useCallback, useEffect, useRef } from 'react';
import { createWithEqualityFn as create } from 'zustand/traditional';

const useScreenStore = create<{
  isAtBottom: boolean;
  isAtTop: boolean;
  setIsAtBottom: (newIsAtBottom: boolean) => void;
  setIsAtTop: (newIsAtTop: boolean) => void;
  scrollTopAnchor: HTMLDivElement | null;
  scrollBottomAnchor: HTMLDivElement | null;
  setScrollTopAnchor: (newScrollTopAnchor: HTMLDivElement | null) => void;
  setScrollBottomAnchor: (newScrollBottomAnchor: HTMLDivElement | null) => void;
}>((set) => {
  const setIsAtBottom = (newIsAtBottom: boolean) => {
    set(() => {
      return {
        isAtBottom: newIsAtBottom,
      };
    });
  };

  const setIsAtTop = (newIsAtTop: boolean) => {
    set(() => {
      return {
        isAtTop: newIsAtTop,
      };
    });
  };

  const setScrollTopAnchor = (newScrollTopAnchor: HTMLDivElement | null) => {
    set(() => {
      return {
        scrollTopAnchor: newScrollTopAnchor,
      };
    });
  };

  const setScrollBottomAnchor = (newScrollBottomAnchor: HTMLDivElement | null) => {
    set(() => {
      return {
        scrollBottomAnchor: newScrollBottomAnchor,
      };
    });
  };

  return {
    isAtBottom: false,
    isAtTop: false,
    setIsAtBottom,
    setIsAtTop,
    scrollTopAnchor: null,
    scrollBottomAnchor: null,
    setScrollTopAnchor,
    setScrollBottomAnchor,
  };
});

export const useScreen = (options?: { useWindowScroll?: boolean }) => {
  const useWindowScroll = options?.useWindowScroll ?? false;
  const {
    isAtBottom,
    isAtTop,
    setIsAtBottom,
    setIsAtTop,
    scrollTopAnchor,
    setScrollTopAnchor,
    scrollBottomAnchor,
    setScrollBottomAnchor,
  } = useScreenStore();

  const screen = useRef<HTMLDivElement>(null);

  // スクリーンのサイズや位置が変わったことを通知する関数
  // 初期時、スクロール時に呼ばれる
  // チャットの要素読み込み完了時には自動で下までスクロールされるため、そこでも呼ばれる
  const notifyScreen = useCallback(
    (element: HTMLElement) => {
      // 最下部に到達している時に isAtBottom を true に
      // sticky 要素やサブピクセルレンダリングを考慮して余裕を設ける
      const diff = element.scrollHeight - (element.clientHeight + element.scrollTop);
      if (diff <= 50) {
        setIsAtBottom(true);
      } else {
        setIsAtBottom(false);
      }

      // 最上部に到達している時に isAtTop を true に
      // 小数点が省略されることがあるため、1.0 の余裕を設ける
      if (element.scrollTop <= 1.0) {
        setIsAtTop(true);
      } else {
        setIsAtTop(false);
      }
    },
    [setIsAtBottom, setIsAtTop],
  );

  // div ベースのスクロール監視
  useEffect(() => {
    if (useWindowScroll) return;
    const current = screen.current;

    if (!current) return;

    const handleScroll = () => {
      notifyScreen(current);
    };

    current.addEventListener('scroll', handleScroll);
    notifyScreen(current);

    return () => {
      current.removeEventListener('scroll', handleScroll);
    };
  }, [screen, notifyScreen, useWindowScroll]);

  // window ベースのスクロール監視（LayoutBody 用）
  useEffect(() => {
    if (!useWindowScroll) return;

    const handleScroll = () => {
      notifyScreen(document.documentElement);
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [notifyScreen, useWindowScroll]);

  const scrollTopAnchorRef = useRef(null);
  const scrollBottomAnchorRef = useRef(null);

  useEffect(() => {
    if (scrollTopAnchorRef.current) {
      setScrollTopAnchor(scrollTopAnchorRef.current);
    }
  }, [scrollTopAnchorRef, setScrollTopAnchor]);

  useEffect(() => {
    if (scrollBottomAnchorRef.current) {
      setScrollBottomAnchor(scrollBottomAnchorRef.current);
    }
  }, [scrollBottomAnchorRef, setScrollBottomAnchor]);

  const scrollToBottom = useCallback(() => {
    if (scrollBottomAnchor) {
      scrollBottomAnchor.scrollIntoView({ behavior: 'instant' });
    }
  }, [scrollBottomAnchor]);

  const scrollToTop = useCallback(() => {
    if (scrollTopAnchor) {
      scrollTopAnchor.scrollIntoView({ behavior: 'instant' });
    }
  }, [scrollTopAnchor]);

  return {
    screen,
    notifyScreen,
    isAtBottom,
    isAtTop,
    setIsAtBottom,
    setIsAtTop,
    scrollTopAnchorRef,
    scrollBottomAnchorRef,
    scrollToBottom,
    scrollToTop,
  };
};
