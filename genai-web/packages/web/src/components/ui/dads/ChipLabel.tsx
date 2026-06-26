import type { ComponentProps } from 'react';

export type ChipLabelProps = ComponentProps<'span'>;

export const ChipLabel = (props: ChipLabelProps) => {
  const { children, className, ...rest } = props;

  return (
    <span
      className={`inline-flex min-h-8 items-center justify-center rounded-8 border border-transparent px-2 py-1 text-oln-16N-100 ${className ?? ''}`}
      {...rest}
    >
      {children}
    </span>
  );
};
