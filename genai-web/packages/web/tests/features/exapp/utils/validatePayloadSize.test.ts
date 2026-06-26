import { describe, expect, it } from 'vitest';
import { validatePayloadSize } from '../../../../src/features/exapp/utils/validatePayloadSize';

describe('validatePayloadSize', () => {
  describe('正常系（サイズ以下の場合）', () => {
    it('空のデータとファイルで制限内と判定する', () => {
      const result = validatePayloadSize('1MB', {}, []);

      expect(result).toBe(true);
    });

    it('データのみで制限内の場合にtrueを返す', () => {
      const data = { message: 'Hello, World!' };

      const result = validatePayloadSize('1MB', data, []);

      expect(result).toBe(true);
    });

    it('ファイルのみで制限内の場合にtrueを返す', () => {
      const files = [
        {
          key: 'document',
          files: [{ filename: 'test.txt', content: 'a'.repeat(100) }],
        },
      ];

      const result = validatePayloadSize('1MB', {}, files);

      expect(result).toBe(true);
    });

    it('データとファイルの合計が制限内の場合にtrueを返す', () => {
      const data = { message: 'Test message' };
      const files = [
        {
          key: 'file',
          files: [{ filename: 'test.txt', content: 'Small content' }],
        },
      ];

      const result = validatePayloadSize('1MB', data, files);

      expect(result).toBe(true);
    });

    it('ちょうど制限と同じサイズの場合にtrueを返す', () => {
      // 1KBちょうどのコンテンツを作成
      const content = 'a'.repeat(1024);
      const files = [
        {
          key: 'file',
          files: [{ filename: 'test.txt', content }],
        },
      ];

      const result = validatePayloadSize('1KB', {}, files);

      expect(result).toBe(true);
    });
  });

  describe('異常系（サイズ超過の場合）', () => {
    it('データが制限を超える場合にfalseを返す', () => {
      // 1KBを超えるデータを作成
      const data = { message: 'a'.repeat(2000) };

      const result = validatePayloadSize('1KB', data, []);

      expect(result).toBe(false);
    });

    it('ファイルが制限を超える場合にfalseを返す', () => {
      // 1KBを超えるファイルを作成
      const files = [
        {
          key: 'file',
          files: [{ filename: 'large.txt', content: 'a'.repeat(2000) }],
        },
      ];

      const result = validatePayloadSize('1KB', {}, files);

      expect(result).toBe(false);
    });

    it('データとファイルの合計が制限を超える場合にfalseを返す', () => {
      const data = { message: 'a'.repeat(600) };
      const files = [
        {
          key: 'file',
          files: [{ filename: 'test.txt', content: 'a'.repeat(600) }],
        },
      ];

      const result = validatePayloadSize('1KB', data, files);

      expect(result).toBe(false);
    });
  });

  describe('複数ファイルの処理', () => {
    it('複数のファイルグループを正しく計算する', () => {
      const files = [
        {
          key: 'images',
          files: [
            { filename: 'img1.png', content: 'a'.repeat(100) },
            { filename: 'img2.png', content: 'b'.repeat(100) },
          ],
        },
        {
          key: 'documents',
          files: [{ filename: 'doc.pdf', content: 'c'.repeat(100) }],
        },
      ];

      // 合計300バイト、1KBは十分
      const result = validatePayloadSize('1KB', {}, files);

      expect(result).toBe(true);
    });

    it('複数ファイルの合計が制限を超える場合にfalseを返す', () => {
      const files = [
        {
          key: 'files',
          files: [
            { filename: 'file1.txt', content: 'a'.repeat(400) },
            { filename: 'file2.txt', content: 'b'.repeat(400) },
            { filename: 'file3.txt', content: 'c'.repeat(400) },
          ],
        },
      ];

      // 合計1200バイト、1KBを超える
      const result = validatePayloadSize('1KB', {}, files);

      expect(result).toBe(false);
    });
  });

  describe('複数フィールドのデータ処理', () => {
    it('複数のデータフィールドを正しく計算する', () => {
      const data = {
        field1: 'a'.repeat(100),
        field2: 'b'.repeat(100),
        field3: 'c'.repeat(100),
      };

      // 合計300バイト程度、1KBは十分
      const result = validatePayloadSize('1KB', data, []);

      expect(result).toBe(true);
    });

    it('数値やブール値を含むデータを正しく処理する', () => {
      const data = {
        count: 12345,
        isActive: true,
        rate: Math.PI,
      };

      const result = validatePayloadSize('1KB', data, []);

      expect(result).toBe(true);
    });
  });

  describe('さまざまなサイズ単位', () => {
    it('バイト単位で正しく判定する', () => {
      const data = { message: 'Hello' }; // 5バイト

      expect(validatePayloadSize('10B', data, [])).toBe(true);
      expect(validatePayloadSize('3B', data, [])).toBe(false);
    });

    it('メガバイト単位で正しく判定する', () => {
      const data = { message: 'Small data' };

      const result = validatePayloadSize('5MB', data, []);

      expect(result).toBe(true);
    });

    it('ギガバイト単位で正しく判定する', () => {
      const largeContent = 'a'.repeat(1024 * 1024); // 1MB
      const files = [
        {
          key: 'file',
          files: [{ filename: 'large.bin', content: largeContent }],
        },
      ];

      const result = validatePayloadSize('1GB', {}, files);

      expect(result).toBe(true);
    });
  });
});
