/**
 * 配列の要素を指定されたキー関数で一意化する
 * @param array - 一意化する配列
 * @param iteratee - 各要素のキーを取得する関数または文字列
 * @returns 一意化された配列
 */
export const uniqBy = <T>(array: T[], iteratee: ((item: T) => unknown) | keyof T): T[] => {
  const seen = new Set<unknown>();
  const result: T[] = [];

  const getKey = typeof iteratee === 'function' ? iteratee : (item: T) => item[iteratee as keyof T];

  for (const item of array) {
    const key = getKey(item);
    if (!seen.has(key)) {
      seen.add(key);
      result.push(item);
    }
  }

  return result;
};
