/**
 * 正規表現で使用される特殊文字をエスケープする
 * @param str - エスケープ対象の文字列
 * @returns 正規表現のエスケープ処理後の文字列
 */
export const escapeRegExp = (str: string) => {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};
