// DADS v2.1.2
import { Children, type HTMLAttributes, type ReactNode, cloneElement, isValidElement } from 'react';

type SlotProps = HTMLAttributes<HTMLElement> & {
  children?: ReactNode;
};

export const Slot = (props: SlotProps) => {
  const { children, ...rest } = props;

  // https://react.dev/reference/react/isValidElement
  // https://react.dev/reference/react/cloneElement
  if (children && isValidElement(children)) {
    const childrenProps = children.props as HTMLAttributes<HTMLElement>;
    return cloneElement(children, {
      ...rest,
      ...childrenProps,
      ...{
        className: `${rest.className ?? ''} ${childrenProps.className ?? ''}`,
      },
    });
  }

  if (Children.count(children) > 1) {
    Children.only(null);
  }

  return null;
};
