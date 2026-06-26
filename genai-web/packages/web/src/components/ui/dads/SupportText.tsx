import type { ComponentProps } from 'react';

export type SupportTextProps = ComponentProps<'p'>;

export const SupportTextStyles = 'text-std-16N-170 text-solid-gray-600';

export const SupportText = (props: SupportTextProps) => {
  const { children, className, ...rest } = props;

  return (
    <p className={`${SupportTextStyles} ${className ?? ''}`} {...rest}>
      {children}
    </p>
  );
};
