import { type ComponentProps, forwardRef } from 'react';

export type InputBlockSize = 'lg' | 'md' | 'sm';

export type InputProps = ComponentProps<'input'> & {
  isError?: boolean;
  blockSize?: InputBlockSize;
};

export const Input = forwardRef<HTMLInputElement, InputProps>((props, ref) => {
  const { className, readOnly, isError, blockSize = 'lg', ...rest } = props;

  return (
    <input
      className={`max-w-full rounded-8 border border-solid-gray-600 bg-white px-4 py-3 text-oln-16N-100 text-solid-gray-800 read-only:border-dashed focus:ring-[calc(2/16*1rem)] focus:ring-yellow-300 focus:outline-4 focus:outline-offset-[calc(2/16*1rem)] focus:outline-black aria-disabled:pointer-events-none aria-disabled:border-solid! aria-disabled:border-solid-gray-300 aria-disabled:bg-solid-gray-50 aria-disabled:text-solid-gray-420 aria-[invalid=true]:border-error-1 data-[size=lg]:h-14 data-[size=md]:h-12 data-[size=sm]:h-10 aria-disabled:forced-colors:border-[GrayText] aria-disabled:forced-colors:text-[GrayText] hover:[&:read-write]:border-black aria-[invalid=true]:[&:read-write]:hover:border-red-1000 ${className ?? ''}`}
      aria-invalid={isError || undefined}
      data-size={blockSize}
      readOnly={props['aria-disabled'] ? true : readOnly}
      ref={ref}
      {...rest}
    />
  );
});
