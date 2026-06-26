import type { FieldErrors, FieldValues } from 'react-hook-form';
import type { GovAIFormUIItem } from '../types';
import { isHiddenType, isNumberType, isTextareaType, isTextType } from './typeGuards';

/**
 * フォームバリデーションエラーを人間が読めるメッセージに変換する
 * @param key - フォームフィールドのキー
 * @param item - フォームUIの設定
 * @param errors - React Hook Formのエラーオブジェクト
 * @returns エラーメッセージ
 */
export const formatValidationErrorMessage = (
  key: string,
  item: GovAIFormUIItem,
  errors: FieldErrors<FieldValues>,
): string => {
  const error = errors[key];

  if (!error) {
    return '';
  }

  if (!isHiddenType(item) && error.type === 'required') {
    return `${item.title}は必須です。`;
  } else if (isNumberType(item) && error.type === 'min') {
    return `${item.title}は${item.min}以上を入力してください。`;
  } else if (isNumberType(item) && error.type === 'max') {
    return `${item.title}は${item.max}以下で入力してください。`;
  } else if ((isTextType(item) || isTextareaType(item)) && error.type === 'minLength') {
    return `${item.title}は${item.min_length}文字以上で入力してください。`;
  } else if ((isTextType(item) || isTextareaType(item)) && error.type === 'maxLength') {
    return `${item.title}は${item.max_length}文字以下で入力してください。`;
  } else if (error.type === 'validate') {
    return error.message?.toString() ?? '';
  }

  return '';
};
