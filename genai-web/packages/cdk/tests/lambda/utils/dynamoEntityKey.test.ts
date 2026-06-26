import { describe, expect, it } from 'vitest';
import {
  generateExAppId,
  generateTeamId,
  getExAppId,
  getTeamId,
  getUserId,
} from '../../../lambda/utils/dynamoEntityKey';

describe('dynamoEntityKey', () => {
  describe('generateTeamId', () => {
    it('team#プレフィックス付きのIDを生成する', () => {
      const result = generateTeamId();

      expect(result).toMatch(/^team#[0-9a-f-]{36}$/);
    });

    it('毎回異なるIDを生成する', () => {
      const result1 = generateTeamId();
      const result2 = generateTeamId();

      expect(result1).not.toBe(result2);
    });
  });

  describe('getTeamId', () => {
    it('team#プレフィックス付きのIDを返す', () => {
      const result = getTeamId('abc123');

      expect(result).toBe('team#abc123');
    });

    it('空文字列の場合もプレフィックスを付ける', () => {
      const result = getTeamId('');

      expect(result).toBe('team#');
    });
  });

  describe('getUserId', () => {
    it('user#プレフィックス付きのIDを返す', () => {
      const result = getUserId('user-abc');

      expect(result).toBe('user#user-abc');
    });

    it('空文字列の場合もプレフィックスを付ける', () => {
      const result = getUserId('');

      expect(result).toBe('user#');
    });
  });

  describe('generateExAppId', () => {
    it('exapp#プレフィックス付きのIDを生成する', () => {
      const result = generateExAppId();

      expect(result).toMatch(/^exapp#[0-9a-f-]{36}$/);
    });

    it('毎回異なるIDを生成する', () => {
      const result1 = generateExAppId();
      const result2 = generateExAppId();

      expect(result1).not.toBe(result2);
    });
  });

  describe('getExAppId', () => {
    it('exapp#プレフィックス付きのIDを返す', () => {
      const result = getExAppId('app-xyz');

      expect(result).toBe('exapp#app-xyz');
    });

    it('空文字列の場合もプレフィックスを付ける', () => {
      const result = getExAppId('');

      expect(result).toBe('exapp#');
    });
  });
});
