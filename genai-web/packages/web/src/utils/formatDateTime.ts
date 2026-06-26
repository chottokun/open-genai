/**
 * タイムスタンプを日本語の日付形式にフォーマットする
 * @param timestamp - フォーマットする日付のタイムスタンプ(文字列または数値)
 * @returns 日本語形式の日付文字列 (例: "2025年10月10日 18:03")
 */
export const formatDateTime = (timestamp: string | number): string => {
  return new Date(Number(timestamp)).toLocaleString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  });
};
