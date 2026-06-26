import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router';

// モバイルメニューのブレークポイント
const MOBILE_MENU_BREAKPOINT = 768;

export const useMobileMenuHandler = () => {
  const mobileMenuRef = useRef<HTMLDialogElement>(null);
  const { pathname } = useLocation();

  useEffect(() => {
    // モバイルメニューをページ遷移時に閉じる
    const closeMobileMenu = () => {
      if (mobileMenuRef.current?.open) {
        mobileMenuRef.current.close();
      }
    };
    closeMobileMenu();
  }, [pathname]);

  useEffect(() => {
    // 768px 以上の場合は開いた状態でも強制的に非表示
    // Backdrop が残ったままになると操作ができなくなるため
    const closeMobileMenuOnResize = () => {
      if (window.innerWidth >= MOBILE_MENU_BREAKPOINT && mobileMenuRef.current?.open) {
        mobileMenuRef.current.close();
      }
    };
    closeMobileMenuOnResize();

    window.addEventListener('resize', closeMobileMenuOnResize);
    return () => {
      window.removeEventListener('resize', closeMobileMenuOnResize);
    };
  }, []);

  return { mobileMenuRef };
};
