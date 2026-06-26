import { useCallback, useEffect, useRef, useState } from 'react';

type Props = {
  /** 現在のリストアイテムの総数 */
  itemsLength: number;
  /** 新しく追加されたアイテム内でフォーカスを当てる要素のセレクタ */
  focusSelector: string;
};

/**
 * リストの「さらに読み込む」ボタン等での追加読み込み時に、
 * 新しく追加された最初のアイテムのフォーカス可能な要素にフォーカスを移動するためのフック
 */
export const useFocusNewItemOnLoadMore = <T extends HTMLElement>({
  itemsLength,
  focusSelector,
}: Props) => {
  const [previousCount, setPreviousCount] = useState(0);
  const listRef = useRef<T>(null);

  useEffect(() => {
    // アイテム数が増加し、かつ初期ロード(0件からの増加)ではない場合
    if (itemsLength > previousCount && previousCount > 0) {
      setTimeout(() => {
        if (!listRef.current) {
          return;
        }

        const items = listRef.current.children;
        // previousCount のインデックスが、追加された最初の要素に対応する
        const firstNewItem = items[previousCount] as HTMLElement;

        if (!firstNewItem) {
          return;
        }

        const target = firstNewItem.querySelector(focusSelector) as HTMLElement;
        target?.focus();
      }, 1);
    }
  }, [itemsLength, previousCount, focusSelector]);

  /**
   * 追加読み込みを実行する際に呼び出す関数
   * 現在のアイテム数を保存してから、実際の読み込み処理を実行する
   * @param onLoadMore 実際の読み込み処理を行う関数
   */
  const loadMoreWithFocus = useCallback(
    (onLoadMore: () => void) => {
      setPreviousCount(itemsLength);
      onLoadMore();
    },
    [itemsLength],
  );

  return {
    listRef,
    loadMoreWithFocus,
  };
};
