import type { ReactNode } from 'react';

type Props = {
  children: ReactNode;
};

export const HighLightText = (props: Props) => {
  const { children } = props;
  return <mark className='bg-yellow-200 font-700'>{children}</mark>;
};
