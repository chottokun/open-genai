import { useCallback, useEffect } from 'react';
import { sleep } from '@/utils/sleep';

type PageTitleProps = {
  title?: string;
};

export const PageTitle = (props: PageTitleProps) => {
  const { title } = props;

  const isSafari =
    typeof navigator !== 'undefined' && /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

  /** NOTE:
   * 読み上げ用 Window title を更新するための関数
   * なぜこのような処理をしているかの背景を以下に記載
   * 本当は `title.textContent = document.title;` で良いはずだが、NVDAで `#window-title` にフォーカスが当たった状態でブラウザバック・フォワードを行うとタイトルが読み上げられない
   * `title.blur()` を一旦呼んでもう一度 `focus()` すると NVDA では読み上げられるようになったが、Safari + VO では依然ページタイトルが読み上げられない
   * そのため、Safari だけ分岐し `#window-title` を一旦 DOM から削除して再度追加することで、強制的に Safari + VO でページタイトルが読み上げられるようにしている
   */
  const focusWindowTitle = useCallback(async () => {
    const titleElement = document.getElementById('window-title');
    if (!titleElement) return;

    const titleText = (document.title || '').trim();

    if (isSafari) {
      const newTitle = titleElement.cloneNode(true) as HTMLElement;
      newTitle.textContent = titleText;
      if (titleElement.parentNode) {
        (titleElement.parentNode as HTMLElement).insertBefore(newTitle, titleElement);
        titleElement.remove();
        // Safari で「戻る」「進む」が読み上げられた後にちょうどよく読み上げられるのが300ms後くらい
        // 環境によって変わる可能性はあるので、その時は調整する
        await sleep(300);
        newTitle.focus({ preventScroll: true });
      }
    } else {
      titleElement.blur();
      titleElement.textContent = titleText;
      await sleep(100);
      titleElement.focus({ preventScroll: true });
    }
  }, []);

  useEffect(() => {
    if (!title) {
      return;
    }
    focusWindowTitle();
  }, [title]);

  if (!title) {
    return null;
  }

  return <title>{title}</title>;
};
