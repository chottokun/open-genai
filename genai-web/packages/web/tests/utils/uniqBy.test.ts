import { describe, expect, it } from 'vitest';
import { uniqBy } from '../../src/utils/uniqBy';

describe('uniqBy', () => {
  describe('関数をキーとして使用', () => {
    it('オブジェクト配列を関数で一意化する', () => {
      const input = [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
        { id: 1, name: 'Charlie' },
      ];
      const result = uniqBy(input, (item) => item.id);
      expect(result).toEqual([
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
      ]);
    });

    it('最初に出現した要素を保持する', () => {
      const input = [
        { id: 1, value: 'first' },
        { id: 1, value: 'second' },
        { id: 1, value: 'third' },
      ];
      const result = uniqBy(input, (item) => item.id);
      expect(result).toEqual([{ id: 1, value: 'first' }]);
    });

    it('複数のプロパティを組み合わせたキーで一意化する', () => {
      const input = [
        { type: 'A', code: 1 },
        { type: 'B', code: 1 },
        { type: 'A', code: 1 },
      ];
      const result = uniqBy(input, (item) => `${item.type}-${item.code}`);
      expect(result).toEqual([
        { type: 'A', code: 1 },
        { type: 'B', code: 1 },
      ]);
    });
  });

  describe('文字列キーを使用', () => {
    it('プロパティ名で一意化する', () => {
      const input = [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
        { id: 1, name: 'Charlie' },
      ];
      const result = uniqBy(input, 'id');
      expect(result).toEqual([
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
      ]);
    });

    it('文字列プロパティで一意化する', () => {
      const input = [
        { id: 1, category: 'fruit' },
        { id: 2, category: 'vegetable' },
        { id: 3, category: 'fruit' },
      ];
      const result = uniqBy(input, 'category');
      expect(result).toEqual([
        { id: 1, category: 'fruit' },
        { id: 2, category: 'vegetable' },
      ]);
    });
  });

  describe('境界値', () => {
    it('空配列を処理する', () => {
      const result = uniqBy([], (item: { id: number }) => item.id);
      expect(result).toEqual([]);
    });

    it('1要素の配列をそのまま返す', () => {
      const input = [{ id: 1, name: 'Alice' }];
      const result = uniqBy(input, 'id');
      expect(result).toEqual([{ id: 1, name: 'Alice' }]);
    });

    it('すべて一意な要素の場合はそのまま返す', () => {
      const input = [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
        { id: 3, name: 'Charlie' },
      ];
      const result = uniqBy(input, 'id');
      expect(result).toEqual(input);
    });

    it('すべて同じキーの場合は最初の要素のみ返す', () => {
      const input = [
        { id: 1, name: 'First' },
        { id: 1, name: 'Second' },
        { id: 1, name: 'Third' },
      ];
      const result = uniqBy(input, 'id');
      expect(result).toEqual([{ id: 1, name: 'First' }]);
    });
  });

  describe('さまざまな型のキー', () => {
    it('undefinedをキーとして処理する', () => {
      const input = [
        { id: undefined, name: 'First' },
        { id: undefined, name: 'Second' },
        { id: 1, name: 'Third' },
      ];
      const result = uniqBy(input, 'id');
      expect(result).toEqual([
        { id: undefined, name: 'First' },
        { id: 1, name: 'Third' },
      ]);
    });

    it('nullをキーとして処理する', () => {
      const input = [
        { id: null, name: 'First' },
        { id: null, name: 'Second' },
        { id: 1, name: 'Third' },
      ];
      const result = uniqBy(input, 'id');
      expect(result).toEqual([
        { id: null, name: 'First' },
        { id: 1, name: 'Third' },
      ]);
    });

    it('真偽値をキーとして処理する', () => {
      const input = [
        { active: true, name: 'A' },
        { active: false, name: 'B' },
        { active: true, name: 'C' },
      ];
      const result = uniqBy(input, 'active');
      expect(result).toEqual([
        { active: true, name: 'A' },
        { active: false, name: 'B' },
      ]);
    });
  });

  describe('元の配列を変更しない', () => {
    it('元の配列が変更されないことを確認する', () => {
      const input = [
        { id: 1, name: 'Alice' },
        { id: 1, name: 'Bob' },
      ];
      const inputCopy = [...input];
      uniqBy(input, 'id');
      expect(input).toEqual(inputCopy);
    });
  });
});
