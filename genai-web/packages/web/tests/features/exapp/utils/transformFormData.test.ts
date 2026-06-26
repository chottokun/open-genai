import { describe, expect, it } from 'vitest';
import type { GovAIFormUIJson } from '../../../../src/features/exapp/types';
import { transformFormData } from '../../../../src/features/exapp/utils/transformFormData';

describe('transformFormData', () => {
  const emptyUiJson: GovAIFormUIJson = {};

  describe('配列の変換', () => {
    it('配列をカンマ区切りの文字列に変換する', () => {
      const data = { tags: ['tag1', 'tag2', 'tag3'] };

      const result = transformFormData(data, emptyUiJson);

      expect(result.tags).toBe('tag1,tag2,tag3');
    });

    it('空の配列を空文字列に変換する', () => {
      const data = { tags: [] };

      const result = transformFormData(data, emptyUiJson);

      expect(result.tags).toBe('');
    });

    it('単一要素の配列をそのまま文字列に変換する', () => {
      const data = { tags: ['single'] };

      const result = transformFormData(data, emptyUiJson);

      expect(result.tags).toBe('single');
    });
  });

  describe('数値文字列の変換', () => {
    it('整数文字列を数値に変換する', () => {
      const data = { count: '123' };

      const result = transformFormData(data, emptyUiJson);

      expect(result.count).toBe(123);
    });

    it('負の整数文字列を数値に変換する', () => {
      const data = { count: '-456' };

      const result = transformFormData(data, emptyUiJson);

      expect(result.count).toBe(-456);
    });

    it('小数文字列を数値に変換する', () => {
      const data = { rate: '3.14' };

      const result = transformFormData(data, emptyUiJson);

      expect(result.rate).toBe(3.14);
    });

    it('負の小数文字列を数値に変換する', () => {
      const data = { rate: '-2.5' };

      const result = transformFormData(data, emptyUiJson);

      expect(result.rate).toBe(-2.5);
    });

    it('0を正しく変換する', () => {
      const data = { count: '0' };

      const result = transformFormData(data, emptyUiJson);

      expect(result.count).toBe(0);
    });

    it('数値として無効な文字列は変換しない', () => {
      const data = { text: '123abc', text2: 'abc123', text3: '12.34.56' };

      const result = transformFormData(data, emptyUiJson);

      expect(result.text).toBe('123abc');
      expect(result.text2).toBe('abc123');
      expect(result.text3).toBe('12.34.56');
    });

    it('先頭が0の数値は変換しない（8進数表記を避ける）', () => {
      const data = { code: '0123' };

      const result = transformFormData(data, emptyUiJson);

      // 正規表現が /^[-]?([1-9]\d*|0)(\.\d+)?$/ なので、0123は変換されない
      expect(result.code).toBe('0123');
    });
  });

  describe('ブール値文字列の変換', () => {
    it('"true"をブール値trueに変換する', () => {
      const data = { isActive: 'true' };

      const result = transformFormData(data, emptyUiJson);

      expect(result.isActive).toBe(true);
    });

    it('"false"をブール値falseに変換する', () => {
      const data = { isActive: 'false' };

      const result = transformFormData(data, emptyUiJson);

      expect(result.isActive).toBe(false);
    });

    it('"TRUE"や"FALSE"は変換しない', () => {
      const data = { flag1: 'TRUE', flag2: 'FALSE' };

      const result = transformFormData(data, emptyUiJson);

      expect(result.flag1).toBe('TRUE');
      expect(result.flag2).toBe('FALSE');
    });
  });

  describe('FileListのスキップ', () => {
    it('FileList型の値はそのまま保持する', () => {
      // FileListをモック
      const mockFileList = {
        length: 1,
        item: () => new File(['content'], 'test.txt'),
        [Symbol.iterator]: function* () {
          yield new File(['content'], 'test.txt');
        },
      } as unknown as FileList;

      const data = { file: mockFileList, text: 'hello' };

      const result = transformFormData(data, emptyUiJson);

      expect(result.file).toBe(mockFileList);
      expect(result.text).toBe('hello');
    });
  });

  describe('UIスキーマによるfileタイプフィールドの削除', () => {
    it('fileタイプのフィールドを削除する', () => {
      const uiJson: GovAIFormUIJson = {
        document: {
          type: 'file',
          title: 'ドキュメント',
        },
        name: {
          type: 'text',
          title: '名前',
        },
      };
      const data = { document: 'some-value', name: 'テスト' };

      const result = transformFormData(data, uiJson);

      expect(result.document).toBeUndefined();
      expect(result.name).toBe('テスト');
    });

    it('複数のfileタイプフィールドを削除する', () => {
      const uiJson: GovAIFormUIJson = {
        file1: { type: 'file', title: 'ファイル1' },
        file2: { type: 'file', title: 'ファイル2' },
        text: { type: 'text', title: 'テキスト' },
      };
      const data = { file1: 'value1', file2: 'value2', text: 'テキスト値' };

      const result = transformFormData(data, uiJson);

      expect(result.file1).toBeUndefined();
      expect(result.file2).toBeUndefined();
      expect(result.text).toBe('テキスト値');
    });
  });

  describe('複合ケース', () => {
    it('複数の変換を同時に適用する', () => {
      const uiJson: GovAIFormUIJson = {
        attachment: { type: 'file', title: '添付ファイル' },
      };
      const data = {
        count: '42',
        tags: ['a', 'b', 'c'],
        isEnabled: 'true',
        name: 'テスト',
        attachment: 'file-data',
      };

      const result = transformFormData(data, uiJson);

      expect(result.count).toBe(42);
      expect(result.tags).toBe('a,b,c');
      expect(result.isEnabled).toBe(true);
      expect(result.name).toBe('テスト');
      expect(result.attachment).toBeUndefined();
    });

    it('元のデータオブジェクトを変更しない', () => {
      const data = { count: '123' };
      const originalData = { ...data };

      transformFormData(data, emptyUiJson);

      expect(data).toEqual(originalData);
    });
  });
});
