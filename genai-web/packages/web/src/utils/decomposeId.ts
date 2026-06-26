export const decomposeId = (usecaseId: string): string | null => {
  if (!usecaseId.includes('#')) {
    return null;
  }
  return usecaseId.split('#')[1];
};
