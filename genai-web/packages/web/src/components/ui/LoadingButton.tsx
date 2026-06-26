import type React from 'react';
import { ButtonHTMLAttributes, ComponentProps } from 'react';
import { PiSpinnerGap } from 'react-icons/pi';
import { Button, type ButtonSize, type ButtonVariant } from '@/components/ui/dads/Button';

type Props = {
  className?: string;
  variant: ButtonVariant;
  size?: ButtonSize;
  title?: string;
  disabled?: boolean;
  loading?: boolean;
  type?: ButtonHTMLAttributes<HTMLButtonElement>['type'];
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  children: React.ReactNode;
} & Omit<
  ComponentProps<'button'>,
  'className' | 'size' | 'title' | 'disabled' | 'type' | 'onClick' | 'children'
>;

export const LoadingButton = (props: Props) => {
  const {
    children,
    className,
    variant,
    size = 'md',
    title,
    disabled,
    loading,
    type,
    onClick,
    ...rest
  } = props;

  const handleDisabled = (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    e.preventDefault();
  };

  return (
    <Button
      className={`flex items-center justify-center gap-1.5 ${className ?? ''}`}
      variant={variant}
      size={size}
      title={title}
      type={type}
      onClick={disabled || loading ? handleDisabled : onClick}
      aria-disabled={disabled || loading}
      {...rest}
    >
      {loading && <PiSpinnerGap aria-hidden={true} className='size-6 animate-spin' />}
      {children}
    </Button>
  );
};
