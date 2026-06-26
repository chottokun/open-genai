import type React from 'react';
import { useScreen } from '@/hooks/useScreen';

type Props = {
  children: React.ReactNode;
};

// メインコンテンツ全体がスクロール可能なレイアウト用コンポーネント
// チャットページ、画像生成ページ以外で使用
// body のネイティブスクロールを利用する
export const LayoutBody = (props: Props) => {
  const { children } = props;
  const { scrollTopAnchorRef, scrollBottomAnchorRef } = useScreen({ useWindowScroll: true });

  return (
    <div>
      <div ref={scrollTopAnchorRef} />
      <div>{children}</div>
      <div ref={scrollBottomAnchorRef} />
    </div>
  );
};
