/**
 * JSON文字列内の指定されたフィールドの改行をエスケープする
 * @param value - JSON文字列
 * @param fields - エスケープ対象のフィールド名の配列
 * @returns エスケープ処理後のJSON文字列
 */
export const escapeNewlinesInJsonFields = (value: string, fields: string[]): string => {
  let result = value;
  for (const field of fields) {
    result = result.replace(
      new RegExp(`("${field}":\\s*")((?:[^"\\\\]|\\\\.)*)"`, 'g'),
      (_, p1, p2) => {
        const converted = p2.replace(/\r?\n/g, '\\n');
        return `${p1}${converted}"`;
      },
    );
  }
  return result;
};
