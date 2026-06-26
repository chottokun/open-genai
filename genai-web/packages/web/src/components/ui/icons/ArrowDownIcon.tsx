import type { ComponentProps } from 'react';

export type ArrowDownIconProps = ComponentProps<'svg'>;

export const ArrowDownIcon = (props: ArrowDownIconProps) => {
  const { className, ...rest } = props;
  return (
    <svg
      aria-hidden={true}
      className={`${className ?? ''}`}
      fill='none'
      height='16'
      viewBox='0 0 16 16'
      width='16'
      {...rest}
    >
      <g>
        <path
          d='M13.3344 4.40015L8.00104 9.73348L2.66771 4.40015L1.73438 5.33348L8.00104 11.6001L14.2677 5.33348L13.3344 4.40015Z'
          fill='currentColor'
        />
      </g>
    </svg>
  );
};
