import { describe, expect, it, vi } from 'vitest';
import { processFormFiles } from '../../../../src/features/exapp/utils/processFormFiles';

// convertFileToBase64 をモック
vi.mock('../../../../src/features/exapp/utils/convertFileToBase64', () => ({
  convertFileToBase64: vi.fn((file: File) => Promise.resolve(`base64:${file.name}`)),
}));

const createMockFile = (name: string, content = 'test content'): File => {
  return new File([content], name, { type: 'text/plain' });
};

describe('processFormFiles', () => {
  describe('File[] 配列のサポート', () => {
    it('File[] 配列を正しく処理する', async () => {
      const file1 = createMockFile('file1.txt');
      const file2 = createMockFile('file2.txt');
      const data = {
        documents: [file1, file2],
      };

      const result = await processFormFiles(data);

      expect(result).toHaveLength(1);
      expect(result[0].key).toBe('documents');
      expect(result[0].files).toHaveLength(2);
      expect(result[0].files[0]).toEqual({
        filename: 'file1.txt',
        content: 'base64:file1.txt',
      });
      expect(result[0].files[1]).toEqual({
        filename: 'file2.txt',
        content: 'base64:file2.txt',
      });
    });

    it('単一の File を含む配列を正しく処理する', async () => {
      const file = createMockFile('single.txt');
      const data = {
        attachment: [file],
      };

      const result = await processFormFiles(data);

      expect(result).toHaveLength(1);
      expect(result[0].key).toBe('attachment');
      expect(result[0].files).toHaveLength(1);
      expect(result[0].files[0].filename).toBe('single.txt');
    });

    it('空の配列をスキップする', async () => {
      const data = {
        emptyArray: [] as File[],
        textField: 'hello',
      };

      const result = await processFormFiles(data);

      expect(result).toHaveLength(0);
    });
  });

  // 注: FileList のテストはスキップ
  // 実際のアプリケーションでは ExAppInputFile が File[] を使用しているため、
  // FileList のサポートは後方互換性のために残されている

  describe('非ファイルフィールドのスキップ', () => {
    it('文字列フィールドをスキップする', async () => {
      const data = {
        name: 'John',
        email: 'john@example.com',
      };

      const result = await processFormFiles(data);

      expect(result).toHaveLength(0);
    });

    it('数値フィールドをスキップする', async () => {
      const data = {
        count: 42,
        price: 99.99,
      };

      const result = await processFormFiles(data);

      expect(result).toHaveLength(0);
    });

    it('null と undefined をスキップする', async () => {
      const data = {
        nullField: null,
        undefinedField: undefined,
      };

      const result = await processFormFiles(data);

      expect(result).toHaveLength(0);
    });

    it('File 以外のオブジェクト配列をスキップする', async () => {
      const data = {
        items: [{ id: 1 }, { id: 2 }],
        strings: ['a', 'b', 'c'],
      };

      const result = await processFormFiles(data);

      expect(result).toHaveLength(0);
    });
  });
});
