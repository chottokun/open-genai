import type React from 'react';
import { useState } from 'react';
import { Button } from './dads/Button';
import { CheckmarkIcon } from './icons/CheckmarkIcon';
import { CopyIcon } from './icons/CopyIcon';

type Props = {
  className?: string;
  text: string;
  disabled?: boolean;
  targetRef?: React.RefObject<HTMLElement | null>;
};

export const ButtonCopy = (props: Props) => {
  const { className, text, disabled, targetRef } = props;
  const [isShowsCheck, setIsShowsCheck] = useState(false);

  const copyMessage = async (message: string) => {
    if (isShowsCheck) {
      return;
    }

    if (!message || message === '') {
      return;
    }

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(message);
      } else {
        // フォールバック: 非 HTTPS 環境下などで navigator.clipboard が undefined の場合
        const textArea = document.createElement('textarea');
        textArea.value = message;
        textArea.style.position = 'fixed';
        textArea.style.top = '0';
        textArea.style.left = '0';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        if (!successful) {
          throw new Error('document.execCommand("copy") が false を返しました');
        }
      }
    } catch (error) {
      console.error('クリップボードへのコピーに失敗しました', error);
      return;
    }

    setIsShowsCheck(true);

    if (targetRef?.current) {
      targetRef.current.classList.add('animate-copy-highlight');

      // アニメーション終了後にクラスを削除
      setTimeout(() => {
        targetRef?.current?.classList.remove('animate-copy-highlight');
        setIsShowsCheck(false);
      }, 3000);
    } else {
      setTimeout(() => {
        setIsShowsCheck(false);
      }, 3000);
    }
  };

  return (
    <Button
      variant='text'
      type='button'
      size='sm'
      className={`min-w-[calc(102/16*1rem)] inline-flex justify-center gap-1 items-center ${className ?? ''}`}
      disabled={disabled}
      onClick={() => {
        copyMessage(text);
      }}
    >
      {isShowsCheck ? (
        <>
          <CheckmarkIcon className='-ml-1 shrink-0' aria-hidden={true} />
          完了
        </>
      ) : (
        <>
          <CopyIcon className='shrink-0' aria-hidden={true} />
          コピー
        </>
      )}
    </Button>
  );
};
