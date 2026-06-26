import type { FieldErrors, FieldValues } from 'react-hook-form';
import { describe, expect, it } from 'vitest';
import type {
  GovAIFormUIHidden,
  GovAIFormUINumber,
  GovAIFormUISelect,
  GovAIFormUIText,
  GovAIFormUITextarea,
} from '../../../../src/features/exapp/types';
import { formatValidationErrorMessage } from '../../../../src/features/exapp/utils/formatValidationErrorMessage';

describe('formatValidationErrorMessage', () => {
  describe('エラーがない場合', () => {
    it('空文字列を返す', () => {
      const item: GovAIFormUIText = { type: 'text', title: '名前' };
      const errors: FieldErrors<FieldValues> = {};

      const result = formatValidationErrorMessage('name', item, errors);

      expect(result).toBe('');
    });
  });

  describe('requiredエラー', () => {
    it('テキスト型で必須エラーメッセージを返す', () => {
      const item: GovAIFormUIText = { type: 'text', title: '名前' };
      const errors: FieldErrors<FieldValues> = {
        name: { type: 'required', message: '' },
      };

      const result = formatValidationErrorMessage('name', item, errors);

      expect(result).toBe('名前は必須です。');
    });

    it('数値型で必須エラーメッセージを返す', () => {
      const item: GovAIFormUINumber = { type: 'number', title: '年齢' };
      const errors: FieldErrors<FieldValues> = {
        age: { type: 'required', message: '' },
      };

      const result = formatValidationErrorMessage('age', item, errors);

      expect(result).toBe('年齢は必須です。');
    });

    it('セレクト型で必須エラーメッセージを返す', () => {
      const item: GovAIFormUISelect = { type: 'select', title: 'カテゴリ' };
      const errors: FieldErrors<FieldValues> = {
        category: { type: 'required', message: '' },
      };

      const result = formatValidationErrorMessage('category', item, errors);

      expect(result).toBe('カテゴリは必須です。');
    });

    it('hidden型ではrequiredエラーメッセージを返さない', () => {
      const item: GovAIFormUIHidden = { type: 'hidden', default_value: 'test' };
      const errors: FieldErrors<FieldValues> = {
        hiddenField: { type: 'required', message: '' },
      };

      const result = formatValidationErrorMessage('hiddenField', item, errors);

      expect(result).toBe('');
    });
  });

  describe('数値型のmin/maxエラー', () => {
    it('minエラーメッセージを返す', () => {
      const item: GovAIFormUINumber = { type: 'number', title: '数量', min: 1 };
      const errors: FieldErrors<FieldValues> = {
        quantity: { type: 'min', message: '' },
      };

      const result = formatValidationErrorMessage('quantity', item, errors);

      expect(result).toBe('数量は1以上を入力してください。');
    });

    it('maxエラーメッセージを返す', () => {
      const item: GovAIFormUINumber = { type: 'number', title: '数量', max: 100 };
      const errors: FieldErrors<FieldValues> = {
        quantity: { type: 'max', message: '' },
      };

      const result = formatValidationErrorMessage('quantity', item, errors);

      expect(result).toBe('数量は100以下で入力してください。');
    });

    it('テキスト型ではminエラーを処理しない', () => {
      const item: GovAIFormUIText = { type: 'text', title: 'テキスト' };
      const errors: FieldErrors<FieldValues> = {
        text: { type: 'min', message: '' },
      };

      const result = formatValidationErrorMessage('text', item, errors);

      expect(result).toBe('');
    });
  });

  describe('テキスト型のminLength/maxLengthエラー', () => {
    it('minLengthエラーメッセージを返す（text型）', () => {
      const item: GovAIFormUIText = { type: 'text', title: 'ユーザー名', min_length: 3 };
      const errors: FieldErrors<FieldValues> = {
        username: { type: 'minLength', message: '' },
      };

      const result = formatValidationErrorMessage('username', item, errors);

      expect(result).toBe('ユーザー名は3文字以上で入力してください。');
    });

    it('maxLengthエラーメッセージを返す（text型）', () => {
      const item: GovAIFormUIText = { type: 'text', title: 'ユーザー名', max_length: 20 };
      const errors: FieldErrors<FieldValues> = {
        username: { type: 'maxLength', message: '' },
      };

      const result = formatValidationErrorMessage('username', item, errors);

      expect(result).toBe('ユーザー名は20文字以下で入力してください。');
    });

    it('minLengthエラーメッセージを返す（textarea型）', () => {
      const item: GovAIFormUITextarea = { type: 'textarea', title: '説明', min_length: 10 };
      const errors: FieldErrors<FieldValues> = {
        description: { type: 'minLength', message: '' },
      };

      const result = formatValidationErrorMessage('description', item, errors);

      expect(result).toBe('説明は10文字以上で入力してください。');
    });

    it('maxLengthエラーメッセージを返す（textarea型）', () => {
      const item: GovAIFormUITextarea = { type: 'textarea', title: '説明', max_length: 1000 };
      const errors: FieldErrors<FieldValues> = {
        description: { type: 'maxLength', message: '' },
      };

      const result = formatValidationErrorMessage('description', item, errors);

      expect(result).toBe('説明は1000文字以下で入力してください。');
    });

    it('数値型ではminLengthエラーを処理しない', () => {
      const item: GovAIFormUINumber = { type: 'number', title: '数値' };
      const errors: FieldErrors<FieldValues> = {
        number: { type: 'minLength', message: '' },
      };

      const result = formatValidationErrorMessage('number', item, errors);

      expect(result).toBe('');
    });
  });

  describe('validateエラー（カスタムバリデーション）', () => {
    it('カスタムエラーメッセージを返す', () => {
      const item: GovAIFormUIText = { type: 'text', title: 'メール' };
      const errors: FieldErrors<FieldValues> = {
        email: { type: 'validate', message: 'メールアドレスの形式が正しくありません' },
      };

      const result = formatValidationErrorMessage('email', item, errors);

      expect(result).toBe('メールアドレスの形式が正しくありません');
    });

    it('メッセージがない場合は空文字列を返す', () => {
      const item: GovAIFormUIText = { type: 'text', title: 'フィールド' };
      const errors: FieldErrors<FieldValues> = {
        field: { type: 'validate', message: undefined },
      };

      const result = formatValidationErrorMessage('field', item, errors);

      expect(result).toBe('');
    });
  });

  describe('未知のエラータイプ', () => {
    it('未知のエラータイプでは空文字列を返す', () => {
      const item: GovAIFormUIText = { type: 'text', title: 'フィールド' };
      const errors: FieldErrors<FieldValues> = {
        field: { type: 'pattern', message: 'パターンエラー' },
      };

      const result = formatValidationErrorMessage('field', item, errors);

      expect(result).toBe('');
    });
  });
});
