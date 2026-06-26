import type { ComponentProps } from 'react';

export type CheckmarkIconProps = ComponentProps<'svg'>;

export const CheckmarkIcon = (props: CheckmarkIconProps) => {
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
      <path d='M382-240 154-468l57-57 171 171 367-367 57 57-424 424Z' fill='currentColor' />
    </svg>
  );
};
