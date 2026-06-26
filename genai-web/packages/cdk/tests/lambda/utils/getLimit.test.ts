import type { APIGatewayProxyEvent } from 'aws-lambda';
import { describe, expect, it } from 'vitest';
import { getLimit } from '../../../lambda/utils/getLimit';

describe('getLimit', () => {
  const DEFAULT_LIMIT = 30;

  describe('eventがundefinedの場合', () => {
    it('デフォルト値30を返す', () => {
      const result = getLimit(undefined);
      expect(result).toBe(DEFAULT_LIMIT);
    });

    it('引数なしの場合もデフォルト値30を返す', () => {
      const result = getLimit();
      expect(result).toBe(DEFAULT_LIMIT);
    });
  });

  describe('queryStringParametersがundefinedの場合', () => {
    it('デフォルト値30を返す', () => {
      const event = {
        queryStringParameters: undefined,
      } as unknown as APIGatewayProxyEvent;

      const result = getLimit(event);
      expect(result).toBe(DEFAULT_LIMIT);
    });

    it('queryStringParametersがnullの場合もデフォルト値30を返す', () => {
      const event = {
        queryStringParameters: null,
      } as unknown as APIGatewayProxyEvent;

      const result = getLimit(event);
      expect(result).toBe(DEFAULT_LIMIT);
    });
  });

  describe('limitパラメータが未指定の場合', () => {
    it('デフォルト値30を返す', () => {
      const event = {
        queryStringParameters: {},
      } as unknown as APIGatewayProxyEvent;

      const result = getLimit(event);
      expect(result).toBe(DEFAULT_LIMIT);
    });

    it('他のパラメータのみ存在する場合もデフォルト値30を返す', () => {
      const event = {
        queryStringParameters: { page: '1' },
      } as unknown as APIGatewayProxyEvent;

      const result = getLimit(event);
      expect(result).toBe(DEFAULT_LIMIT);
    });
  });

  describe('有効なlimitパラメータが指定された場合', () => {
    it('指定された数値を返す', () => {
      const event = {
        queryStringParameters: { limit: '50' },
      } as unknown as APIGatewayProxyEvent;

      const result = getLimit(event);
      expect(result).toBe(50);
    });

    it('1が指定された場合は1を返す', () => {
      const event = {
        queryStringParameters: { limit: '1' },
      } as unknown as APIGatewayProxyEvent;

      const result = getLimit(event);
      expect(result).toBe(1);
    });

    it('大きな数値が指定された場合はその数値を返す', () => {
      const event = {
        queryStringParameters: { limit: '1000' },
      } as unknown as APIGatewayProxyEvent;

      const result = getLimit(event);
      expect(result).toBe(1000);
    });
  });

  describe('無効なlimitパラメータが指定された場合', () => {
    it('0の場合はデフォルト値30を返す', () => {
      const event = {
        queryStringParameters: { limit: '0' },
      } as unknown as APIGatewayProxyEvent;

      const result = getLimit(event);
      expect(result).toBe(DEFAULT_LIMIT);
    });

    it('負の数の場合はデフォルト値30を返す', () => {
      const event = {
        queryStringParameters: { limit: '-5' },
      } as unknown as APIGatewayProxyEvent;

      const result = getLimit(event);
      expect(result).toBe(DEFAULT_LIMIT);
    });

    it('数値でない文字列の場合はデフォルト値30を返す', () => {
      const event = {
        queryStringParameters: { limit: 'abc' },
      } as unknown as APIGatewayProxyEvent;

      const result = getLimit(event);
      expect(result).toBe(DEFAULT_LIMIT);
    });

    it('空文字の場合はデフォルト値30を返す', () => {
      const event = {
        queryStringParameters: { limit: '' },
      } as unknown as APIGatewayProxyEvent;

      const result = getLimit(event);
      expect(result).toBe(DEFAULT_LIMIT);
    });

    it('小数点を含む文字列の場合は整数部分を返す', () => {
      const event = {
        queryStringParameters: { limit: '10.5' },
      } as unknown as APIGatewayProxyEvent;

      const result = getLimit(event);
      expect(result).toBe(10);
    });
  });
});
