import { describe, expect, it } from 'vitest';
import { convertSizeToBytes } from '../../../../src/features/exapp/utils/convertSizeToBytes';

describe('convertSizeToBytes', () => {
  describe('正常系', () => {
    it('バイト単位を正しく変換する', () => {
      expect(convertSizeToBytes('100B')).toBe(100);
      expect(convertSizeToBytes('0B')).toBe(0);
      expect(convertSizeToBytes('1B')).toBe(1);
    });

    it('キロバイト単位を正しく変換する', () => {
      expect(convertSizeToBytes('1KB')).toBe(1024);
      expect(convertSizeToBytes('2KB')).toBe(2048);
      expect(convertSizeToBytes('1.5KB')).toBe(1536);
    });

    it('メガバイト単位を正しく変換する', () => {
      expect(convertSizeToBytes('1MB')).toBe(1024 ** 2);
      expect(convertSizeToBytes('5MB')).toBe(5 * 1024 ** 2);
      expect(convertSizeToBytes('4.5MB')).toBe(Math.round(4.5 * 1024 ** 2));
    });

    it('ギガバイト単位を正しく変換する', () => {
      expect(convertSizeToBytes('1GB')).toBe(1024 ** 3);
      expect(convertSizeToBytes('1.5GB')).toBe(Math.round(1.5 * 1024 ** 3));
    });

    it('テラバイト単位を正しく変換する', () => {
      expect(convertSizeToBytes('1TB')).toBe(1024 ** 4);
      expect(convertSizeToBytes('2TB')).toBe(2 * 1024 ** 4);
    });

    it('小文字の単位を正しく処理する', () => {
      expect(convertSizeToBytes('1mb')).toBe(1024 ** 2);
      expect(convertSizeToBytes('1kb')).toBe(1024);
      expect(convertSizeToBytes('1gb')).toBe(1024 ** 3);
    });

    it('大文字小文字混在の単位を正しく処理する', () => {
      expect(convertSizeToBytes('1Mb')).toBe(1024 ** 2);
      expect(convertSizeToBytes('1Kb')).toBe(1024);
    });

    it('前後の空白を正しく処理する', () => {
      expect(convertSizeToBytes('  1MB  ')).toBe(1024 ** 2);
      expect(convertSizeToBytes('1MB ')).toBe(1024 ** 2);
      expect(convertSizeToBytes(' 1MB')).toBe(1024 ** 2);
    });

    it('数値と単位の間の空白を正しく処理する', () => {
      expect(convertSizeToBytes('1 MB')).toBe(1024 ** 2);
      expect(convertSizeToBytes('1  MB')).toBe(1024 ** 2);
    });

    it('小数点を含む値を正しく変換する', () => {
      expect(convertSizeToBytes('0.5MB')).toBe(Math.round(0.5 * 1024 ** 2));
      expect(convertSizeToBytes('2.25GB')).toBe(Math.round(2.25 * 1024 ** 3));
    });
  });

  describe('異常系', () => {
    it('無効な形式の場合にエラーをスローする', () => {
      expect(() => convertSizeToBytes('')).toThrow('無効なサイズ形式: ');
      expect(() => convertSizeToBytes('abc')).toThrow('無効なサイズ形式: abc');
      expect(() => convertSizeToBytes('MB')).toThrow('無効なサイズ形式: MB');
      expect(() => convertSizeToBytes('100')).toThrow('無効なサイズ形式: 100');
    });

    it('未対応の単位の場合にエラーをスローする', () => {
      expect(() => convertSizeToBytes('1PB')).toThrow('無効なサイズ形式: 1PB');
      expect(() => convertSizeToBytes('1EB')).toThrow('無効なサイズ形式: 1EB');
    });

    it('負の値の場合にエラーをスローする', () => {
      expect(() => convertSizeToBytes('-1MB')).toThrow('無効なサイズ形式: -1MB');
    });
  });
});
