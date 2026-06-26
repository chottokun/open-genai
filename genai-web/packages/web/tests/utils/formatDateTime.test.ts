import { describe, expect, it } from 'vitest';
import { formatDateTime } from '../../src/utils/formatDateTime';

describe('formatDateTime', () => {
  describe('正常系', () => {
    it('数値タイムスタンプを日本語形式にフォーマットする', () => {
      // 2025年10月10日 18:03 (JST)
      const timestamp = new Date(2025, 9, 10, 18, 3).getTime();
      const result = formatDateTime(timestamp);
      expect(result).toBe('2025年10月10日 18:03');
    });

    it('文字列タイムスタンプを日本語形式にフォーマットする', () => {
      const timestamp = new Date(2025, 9, 10, 18, 3).getTime().toString();
      const result = formatDateTime(timestamp);
      expect(result).toBe('2025年10月10日 18:03');
    });

    it('午前0時を正しくフォーマットする', () => {
      const timestamp = new Date(2025, 0, 1, 0, 0).getTime();
      const result = formatDateTime(timestamp);
      expect(result).toBe('2025年1月1日 0:00');
    });

    it('午後11時59分を正しくフォーマットする', () => {
      const timestamp = new Date(2025, 11, 31, 23, 59).getTime();
      const result = formatDateTime(timestamp);
      expect(result).toBe('2025年12月31日 23:59');
    });

    it('1桁の分を正しくフォーマットする', () => {
      const timestamp = new Date(2025, 5, 15, 9, 5).getTime();
      const result = formatDateTime(timestamp);
      expect(result).toBe('2025年6月15日 9:05');
    });
  });

  describe('さまざまな日付', () => {
    it('うるう年の2月29日を正しくフォーマットする', () => {
      const timestamp = new Date(2024, 1, 29, 12, 30).getTime();
      const result = formatDateTime(timestamp);
      expect(result).toBe('2024年2月29日 12:30');
    });

    it('年初を正しくフォーマットする', () => {
      const timestamp = new Date(2025, 0, 1, 0, 0).getTime();
      const result = formatDateTime(timestamp);
      expect(result).toBe('2025年1月1日 0:00');
    });

    it('年末を正しくフォーマットする', () => {
      const timestamp = new Date(2025, 11, 31, 23, 59).getTime();
      const result = formatDateTime(timestamp);
      expect(result).toBe('2025年12月31日 23:59');
    });
  });

  describe('エッジケース', () => {
    it('大きなタイムスタンプを処理する', () => {
      // 2050年1月1日 0:00 JST
      const timestamp = new Date(2050, 0, 1, 0, 0).getTime();
      const result = formatDateTime(timestamp);
      expect(result).toBe('2050年1月1日 0:00');
    });

    it('負のタイムスタンプ（1970年以前）を処理する', () => {
      // 1969年12月31日 (JST)
      const timestamp = new Date(1969, 11, 31, 12, 0).getTime();
      const result = formatDateTime(timestamp);
      expect(result).toBe('1969年12月31日 12:00');
    });
  });
});
