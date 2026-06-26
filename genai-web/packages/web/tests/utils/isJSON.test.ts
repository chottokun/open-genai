import { describe, expect, it } from 'vitest';
import { isJSON } from '../../src/utils/isJSON';

describe('isJSON', () => {
  describe('正常系 - 有効なJSON', () => {
    it('空のオブジェクトをtrueと判定する', () => {
      expect(isJSON('{}')).toBe(true);
    });

    it('空の配列をtrueと判定する', () => {
      expect(isJSON('[]')).toBe(true);
    });

    it('プロパティを持つオブジェクトをtrueと判定する', () => {
      expect(isJSON('{"key":"value"}')).toBe(true);
    });

    it('要素を持つ配列をtrueと判定する', () => {
      expect(isJSON('[1,2,3]')).toBe(true);
    });

    it('ネストしたオブジェクトをtrueと判定する', () => {
      expect(isJSON('{"outer":{"inner":"value"}}')).toBe(true);
    });

    it('ネストした配列をtrueと判定する', () => {
      expect(isJSON('[[1,2],[3,4]]')).toBe(true);
    });

    it('オブジェクトの配列をtrueと判定する', () => {
      expect(isJSON('[{"a":1},{"b":2}]')).toBe(true);
    });

    it('さまざまな型の値を持つオブジェクトをtrueと判定する', () => {
      const json = '{"str":"hello","num":123,"bool":true,"null":null,"arr":[1,2]}';
      expect(isJSON(json)).toBe(true);
    });

    it('前後に空白があるJSONをtrueと判定する', () => {
      expect(isJSON('  {"key":"value"}  ')).toBe(true);
    });

    it('改行を含むJSONをtrueと判定する', () => {
      expect(isJSON('{\n  "key": "value"\n}')).toBe(true);
    });
  });

  describe('異常系 - 無効なJSON', () => {
    it('空文字列をfalseと判定する', () => {
      expect(isJSON('')).toBe(false);
    });

    it('空白のみの文字列をfalseと判定する', () => {
      expect(isJSON('   ')).toBe(false);
      expect(isJSON('\t')).toBe(false);
      expect(isJSON('\n')).toBe(false);
    });

    it('単純な文字列をfalseと判定する', () => {
      expect(isJSON('"hello"')).toBe(false);
    });

    it('数値をfalseと判定する', () => {
      expect(isJSON('123')).toBe(false);
    });

    it('真偽値をfalseと判定する', () => {
      expect(isJSON('true')).toBe(false);
      expect(isJSON('false')).toBe(false);
    });

    it('nullをfalseと判定する', () => {
      expect(isJSON('null')).toBe(false);
    });

    it('不正なJSONをfalseと判定する', () => {
      expect(isJSON('{')).toBe(false);
      expect(isJSON('["a"')).toBe(false);
      expect(isJSON('{key: "value"}')).toBe(false);
    });

    it('クォートなしのキーをfalseと判定する', () => {
      expect(isJSON('{key: "value"}')).toBe(false);
    });

    it('シングルクォートをfalseと判定する', () => {
      expect(isJSON("{'key': 'value'}")).toBe(false);
    });

    it('末尾カンマをfalseと判定する', () => {
      expect(isJSON('{"key":"value",}')).toBe(false);
    });

    it('通常のテキストをfalseと判定する', () => {
      expect(isJSON('Hello, World!')).toBe(false);
    });

    it('HTMLをfalseと判定する', () => {
      expect(isJSON('<div>content</div>')).toBe(false);
    });

    it('undefinedに相当する文字列をfalseと判定する', () => {
      expect(isJSON('undefined')).toBe(false);
    });
  });
});
