import type { ReactNode } from 'react';
import { OfflineScreen } from '@/components/OfflineScreen';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

type Props = {
  children: ReactNode;
};

export const OnlineStatusProvider = ({ children }: Props) => {
  const isOnline = useOnlineStatus();

  if (!isOnline) {
    return <OfflineScreen />;
  }

  return <>{children}</>;
};
