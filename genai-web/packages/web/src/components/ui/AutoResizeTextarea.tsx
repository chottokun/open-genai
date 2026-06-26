import {
  type ComponentProps,
  useCallback,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { Textarea as DadsTextarea } from '@/components/ui/dads/Textarea';

type Props = {
  maxHeight?: number;
} & ComponentProps<typeof DadsTextarea>;

const MAX_HEIGHT = 300;
const BORDER_BLOCK_PX = 2; // border-top (1px) + border-bottom (1px)

export const AutoResizeTextarea = (props: Props) => {
  const { maxHeight, className, rows, onChange, ref, ...rest } = props;

  const [isMax, setIsMax] = useState(false);
  const _maxHeight = maxHeight ?? MAX_HEIGHT;

  const internalRef = useRef<HTMLTextAreaElement>(null);
  useImperativeHandle(ref, () => internalRef.current!, []);

  const handleResize = useCallback(() => {
    if (!internalRef.current) {
      return;
    }

    internalRef.current.style.height = 'auto';

    if (_maxHeight > 0 && internalRef.current.scrollHeight > _maxHeight) {
      internalRef.current.style.height = `${_maxHeight / 16}rem`;
      setIsMax(true);
    } else {
      internalRef.current.style.height = `${(internalRef.current.scrollHeight + BORDER_BLOCK_PX) / 16}rem`;
      setIsMax(false);
    }
  }, [_maxHeight]);

  // rest.value: 制御コンポーネント（value prop）の変更を検知
  // internalRef.current?.value: 非制御コンポーネント（react-hook-form の reset() 等）の変更を検知
  const uncontrolledValue = internalRef.current?.value ?? '';
  useLayoutEffect(() => {
    handleResize();
  }, [handleResize, rest.value, uncontrolledValue, rows]);

  return (
    <DadsTextarea
      ref={internalRef}
      className={`w-full leading-150! ${isMax ? 'overflow-y-auto rounded-r-none' : 'overflow-hidden'} ${className ?? ''}`}
      rows={rows ?? 1}
      onChange={(e) => {
        handleResize();
        onChange?.(e);
      }}
      {...rest}
    />
  );
};
