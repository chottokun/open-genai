import { useCallback } from 'react';
import { useLocalStorage } from './useLocalStorage';

export const useLocalStorageBoolean = (key: string, defaultFlag: boolean) => {
  const [flag, setFlag] = useLocalStorage(key, defaultFlag.toString());

  const flagWrapper = flag === 'true';

  const setFlagWrapper = useCallback(
    (f: boolean) => {
      setFlag(f.toString());
    },
    [setFlag],
  );

  return [flagWrapper, setFlagWrapper] as const;
};
