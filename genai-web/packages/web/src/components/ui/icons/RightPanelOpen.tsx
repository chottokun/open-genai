import type { ComponentProps } from 'react';

export type RightPanelOpenIconProps = ComponentProps<'svg'>;

export const RightPanelOpenIcon = (props: RightPanelOpenIconProps) => {
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
        d='M460-320v-320L300-480l160 160ZM200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h560q33 0 56.5 23.5T840-760v560q0 33-23.5 56.5T760-120H200Zm440-80h120v-560H640v560Zm-80 0v-560H200v560h360Zm80 0h120-120Z'
        fill='currentColor'
      />
    </svg>
  );
};
