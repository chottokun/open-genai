import { type ComponentProps, forwardRef } from 'react';

export type TextareaProps = ComponentProps<'textarea'> & {
  isError?: boolean;
};

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>((props, ref) => {
  const { className, isError, readOnly, ...rest } = props;

  return (
    <textarea
      className={`max-w-full rounded-8 border border-solid-gray-600 bg-white p-4 text-std-16N-170 text-solid-gray-800 read-only:border-dashed focus:ring-[calc(2/16*1rem)] focus:ring-yellow-300 focus:outline-4 focus:outline-offset-[calc(2/16*1rem)] focus:outline-black aria-disabled:pointer-events-none aria-disabled:border-solid-gray-300 aria-disabled:bg-solid-gray-50 aria-disabled:text-solid-gray-420 read-only:aria-disabled:border-solid aria-[invalid=true]:border-error-1 aria-disabled:forced-colors:border-[GrayText] aria-disabled:forced-colors:text-[GrayText] hover:[&:read-write]:border-black aria-[invalid=true]:[&:read-write]:hover:border-red-1000 ${className ?? ''}`}
      aria-invalid={isError || undefined}
      readOnly={props['aria-disabled'] ? true : readOnly}
      ref={ref}
      {...rest}
    />
  );
});
