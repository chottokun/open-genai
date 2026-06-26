import { type RefObject, useEffect, useState } from 'react';

const getHeaderHeightPx = (): number => {
  const headerHeightValue = getComputedStyle(document.documentElement)
    .getPropertyValue('--header-height')
    .trim();

  // rem 単位の場合はピクセルに変換
  if (headerHeightValue.endsWith('rem')) {
    const remValue = parseFloat(headerHeightValue);
    const rootFontSize = parseFloat(getComputedStyle(document.documentElement).fontSize);
    return remValue * rootFontSize;
  }

  // px 単位の場合はそのまま
  if (headerHeightValue.endsWith('px')) {
    return parseFloat(headerHeightValue);
  }

  return 0;
};

export const useStickyHeader = (sentinelRef: RefObject<HTMLElement | null>) => {
  const [isSticky, setIsSticky] = useState(false);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const headerHeightPx = getHeaderHeightPx();

    const observer = new IntersectionObserver(([entry]) => setIsSticky(!entry.isIntersecting), {
      threshold: 0,
      rootMargin: `-${headerHeightPx}px 0px 0px 0px`,
    });
    observer.observe(sentinel);

    return () => observer.disconnect();
  }, [sentinelRef]);

  return isSticky;
};
