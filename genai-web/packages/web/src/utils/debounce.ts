export const debounce = <T extends unknown[]>(
  func: (...args: T) => void,
  delay: number,
): ((...args: T) => void) => {
  let timeout: ReturnType<typeof setTimeout> | undefined;

  return (...args: T): void => {
    if (timeout !== undefined) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => {
      func(...args);
    }, delay);
  };
};
