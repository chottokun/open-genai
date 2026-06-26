export const truncate = (data: any, size: number = 2048): string => {
  const str = typeof data === 'string' ? data : JSON.stringify(data);
  if (str === null || str === undefined) {
    return str;
  }
  return str.substring(0, size);
};
