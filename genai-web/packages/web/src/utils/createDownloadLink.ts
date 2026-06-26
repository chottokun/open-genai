export const download = (url: string, fileName: string): void => {
  const a = document.createElement('a');
  a.setAttribute('href', url);
  a.setAttribute('download', fileName);
  a.click();
  window.URL.revokeObjectURL(url);
};
