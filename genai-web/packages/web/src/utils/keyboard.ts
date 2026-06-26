const isMac = /mac/i.test(navigator.userAgent);

export const submitModifierLabel = isMac ? 'Command' : 'Ctrl';

export const isSubmitKey = (e: Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'metaKey'>): boolean =>
  e.key === 'Enter' && (isMac ? e.metaKey : e.ctrlKey);
