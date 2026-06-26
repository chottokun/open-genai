import { useCallback } from 'react';
import { ExAppOptions } from '../types';

export const useExAppFilter = (searchWords: string[]) => {
  const filterBySearchWords = useCallback(
    (exApps: ExAppOptions[string]['exApps']) => {
      if (searchWords.length === 0) return exApps;
      return exApps.filter((exApp) =>
        searchWords.every((word) => {
          const lowerWord = word.toLowerCase();
          return (
            exApp.label.toLowerCase().includes(lowerWord) ||
            exApp.description.toLowerCase().includes(lowerWord)
          );
        }),
      );
    },
    [searchWords],
  );

  return { filterBySearchWords };
};
