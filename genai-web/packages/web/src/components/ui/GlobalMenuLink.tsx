import { useCallback } from 'react';
import { type LinkProps, Link, useLocation } from 'react-router';

type Props = LinkProps & {
  className?: string;
};

export const GlobalMenuLink = (props: Props) => {
  const { className, to, children, ...rest } = props;
  const location = useLocation();

  const ariaCurrentValue = useCallback(() => {
    if (location.pathname === to) {
      return 'page';
    }
    return undefined;
  }, [location.pathname, to]);

  return (
    <Link
      {...rest}
      to={to}
      aria-current={ariaCurrentValue()}
      className={`
        inline-flex items-center justify-center h-11 px-3 text-oln-16B-100 rounded-infinity
        hover:bg-solid-gray-50 hover:underline hover:underline-offset-[calc(3/16*1rem)]
        focus-visible:bg-yellow-300 focus-visible:outline-4 focus-visible:-outline-offset-[calc(2/16*1rem)] focus-visible:outline-black focus-visible:outline-solid
        aria-[current="page"]:bg-blue-50! aria-[current="page"]:text-blue-900! hover:aria-[current="page"]:no-underline! ${className ?? ''}`}
    >
      {children}
    </Link>
  );
};
