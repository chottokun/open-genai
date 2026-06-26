import { describe, expect, test } from 'vitest';
import { HttpError } from '../../../lambda/utils/httpError';
import { parseJsonBody } from '../../../lambda/utils/parseJsonBody';

describe('parseJsonBody', () => {
  test('有効なJSONをパースして値を返す', () => {
    const result = parseJsonBody('{"name":"テスト","age":30}');
    expect(result).toEqual({ name: 'テスト', age: 30 });
  });

  test('配列や数値などプリミティブも返せる', () => {
    expect(parseJsonBody('[1,2,3]')).toEqual([1, 2, 3]);
    expect(parseJsonBody('42')).toBe(42);
    expect(parseJsonBody('null')).toBeNull();
  });

  test('bodyがnullの場合、HttpError(400)をスローする', () => {
    expect(() => parseJsonBody(null)).toThrow(HttpError);
    try {
      parseJsonBody(null);
    } catch (error) {
      expect((error as HttpError).statusCode).toBe(400);
      expect((error as HttpError).message).toBe('リクエストボディが空です。');
    }
  });

  test('bodyがundefinedの場合、HttpError(400)をスローする', () => {
    expect(() => parseJsonBody(undefined)).toThrow(HttpError);
    try {
      parseJsonBody(undefined);
    } catch (error) {
      expect((error as HttpError).statusCode).toBe(400);
    }
  });

  test('bodyが空文字の場合、HttpError(400)をスローする', () => {
    expect(() => parseJsonBody('')).toThrow(HttpError);
    try {
      parseJsonBody('');
    } catch (error) {
      expect((error as HttpError).statusCode).toBe(400);
    }
  });

  test('不正なJSONの場合、HttpError(400)をスローする', () => {
    expect(() => parseJsonBody('not valid json')).toThrow(HttpError);
    try {
      parseJsonBody('not valid json');
    } catch (error) {
      expect((error as HttpError).statusCode).toBe(400);
      expect((error as HttpError).message).toBe('リクエストボディのJSON形式が不正です。');
    }
  });

  test('壊れたJSON断片の場合もHttpError(400)をスローする', () => {
    expect(() => parseJsonBody('{"name":')).toThrow(HttpError);
    expect(() => parseJsonBody('{name:"テスト"}')).toThrow(HttpError);
  });
});
