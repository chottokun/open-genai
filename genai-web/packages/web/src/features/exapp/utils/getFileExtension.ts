/**
 * ファイル名から拡張子を取得する
 * @param fileName - ファイル名
 * @returns 拡張子（小文字）
 */
export const getFileExtension = (fileName: string): string => {
  const parts = fileName.split('.');
  if (parts.length === 0) {
    return '';
  }
  return parts.pop()?.toLowerCase() ?? '';
};
