import { describe, expect, test } from 'vitest';
import { z } from 'zod';
import { HttpError } from '../../../lambda/utils/httpError';
import { parseRequestBody } from '../../../lambda/utils/parseRequestBody';

const testSchema = z.object({
  name: z.string({ error: '名前は文字列で入力してください。' }).trim().min(1, '名前は必須です。'),
  age: z.number({ error: '年齢は数値で入力してください。' }).optional(),
});

describe('parseRequestBody', () => {
  test('有効なJSONをパースしてバリデーション済みのデータを返す', () => {
    const body = JSON.stringify({ name: 'テスト太郎', age: 30 });

    const result = parseRequestBody(testSchema, body);

    expect(result).toEqual({ name: 'テスト太郎', age: 30 });
  });

  test('optionalフィールドが省略されていても成功する', () => {
    const body = JSON.stringify({ name: 'テスト太郎' });

    const result = parseRequestBody(testSchema, body);

    expect(result).toEqual({ name: 'テスト太郎' });
  });

  test('trim()が適用される', () => {
    const body = JSON.stringify({ name: '  テスト太郎  ' });

    const result = parseRequestBody(testSchema, body);

    expect(result.name).toBe('テスト太郎');
  });

  test('必須フィールドが空文字の場合、HttpError(400)をスローする', () => {
    const body = JSON.stringify({ name: '' });

    expect(() => parseRequestBody(testSchema, body)).toThrow(HttpError);
    expect(() => parseRequestBody(testSchema, body)).toThrow('名前は必須です。');
    try {
      parseRequestBody(testSchema, body);
    } catch (error) {
      expect((error as HttpError).statusCode).toBe(400);
    }
  });

  test('型が不正な場合、カスタムエラーメッセージでHttpError(400)をスローする', () => {
    const body = JSON.stringify({ name: 123 });

    expect(() => parseRequestBody(testSchema, body)).toThrow(HttpError);
    expect(() => parseRequestBody(testSchema, body)).toThrow('名前は文字列で入力してください。');
    try {
      parseRequestBody(testSchema, body);
    } catch (error) {
      expect((error as HttpError).statusCode).toBe(400);
    }
  });

  test('無効なJSONの場合、HttpError(400)をスローする', () => {
    expect(() => parseRequestBody(testSchema, 'not valid json')).toThrow(HttpError);
    try {
      parseRequestBody(testSchema, 'not valid json');
    } catch (error) {
      expect((error as HttpError).statusCode).toBe(400);
      expect((error as HttpError).message).toBe('リクエストボディのJSON形式が不正です。');
    }
  });

  test('空白のみの必須フィールドはtrimにより空文字となりエラーになる', () => {
    const body = JSON.stringify({ name: '   ' });

    expect(() => parseRequestBody(testSchema, body)).toThrow(HttpError);
    expect(() => parseRequestBody(testSchema, body)).toThrow('名前は必須です。');
  });
});
