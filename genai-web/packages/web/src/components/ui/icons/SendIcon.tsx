import type { ComponentProps } from 'react';

export type SendIconProps = ComponentProps<'svg'>;

export const SendIcon = (props: SendIconProps) => {
  const { className, ...rest } = props;
  return (
    <svg
      className={`${className ?? ''}`}
      width='24'
      height='24'
      viewBox='0 -960 960 960'
      fill='none'
      {...rest}
    >
      <path
        d='M120-160v-640l760 320-760 320Zm80-120 474-200-474-200v140l240 60-240 60v140Zm0 0v-400 400Z'
        fill='currentColor'
      />
    </svg>
  );
};
