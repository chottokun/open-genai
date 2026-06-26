import { GovAIFormUIJson } from '../types';

const NUMBER_REGEXP = /^[-]?([1-9]\d*|0)(\.\d+)?$/;

/**
 * フォームデータの値を適切な型に変換する
 * - 配列はカンマ区切りの文字列に変換
 * - 数値文字列は数値に変換
 * - "true"/"false" 文字列はブール値に変換
 * - FileList型のフィールドは削除
 *
 * @param data - フォームデータ
 * @param uiJson - UIスキーマ（fileタイプのフィールドを識別するため）
 * @returns 変換されたフォームデータ
 */
export const transformFormData = (
  data: Record<string, unknown>,
  uiJson: GovAIFormUIJson,
): Record<string, unknown> => {
  const result = { ...data };

  for (const key of Object.keys(result)) {
    const value = result[key];

    // FileList型は後で別処理するのでスキップ
    if (value instanceof FileList) {
      continue;
    }

    // 配列はカンマ区切りの文字列に変換
    if (Array.isArray(value)) {
      result[key] = value.join(',');
      continue;
    }

    // 文字列の場合、数値やブール値に変換
    if (typeof value === 'string') {
      if (NUMBER_REGEXP.test(value)) {
        result[key] = Number(value);
        continue;
      }

      if (value === 'true') {
        result[key] = true;
        continue;
      }

      if (value === 'false') {
        result[key] = false;
      }
    }
  }

  // UIスキーマでfileタイプのフィールドを削除
  for (const key of Object.keys(uiJson)) {
    if (uiJson[key].type === 'file') {
      delete result[key];
    }
  }

  return result;
};
