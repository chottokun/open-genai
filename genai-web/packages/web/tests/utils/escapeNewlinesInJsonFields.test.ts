import { describe, expect, it } from 'vitest';
import { escapeNewlinesInJsonFields } from '../../src/utils/escapeNewlinesInJsonFields';

describe('escapeNewlinesInJsonFields', () => {
  describe('正常系', () => {
    it('指定されたフィールドの改行をエスケープする', () => {
      const input = '{"content":"Hello\nWorld"}';
      const result = escapeNewlinesInJsonFields(input, ['content']);
      expect(result).toBe('{"content":"Hello\\nWorld"}');
    });

    it('複数の改行をエスケープする', () => {
      const input = '{"content":"Line1\nLine2\nLine3"}';
      const result = escapeNewlinesInJsonFields(input, ['content']);
      expect(result).toBe('{"content":"Line1\\nLine2\\nLine3"}');
    });

    it('CRLFをエスケープする', () => {
      const input = '{"content":"Hello\r\nWorld"}';
      const result = escapeNewlinesInJsonFields(input, ['content']);
      expect(result).toBe('{"content":"Hello\\nWorld"}');
    });

    it('複数のフィールドをエスケープする', () => {
      const input = '{"title":"Hello\nWorld","body":"Foo\nBar"}';
      const result = escapeNewlinesInJsonFields(input, ['title', 'body']);
      expect(result).toBe('{"title":"Hello\\nWorld","body":"Foo\\nBar"}');
    });

    it('指定されていないフィールドはエスケープしない', () => {
      const input = '{"title":"Hello\nWorld","body":"Foo\nBar"}';
      const result = escapeNewlinesInJsonFields(input, ['title']);
      expect(result).toBe('{"title":"Hello\\nWorld","body":"Foo\nBar"}');
    });

    it('フィールド名と値の間にスペースがある場合も処理する', () => {
      const input = '{"content": "Hello\nWorld"}';
      const result = escapeNewlinesInJsonFields(input, ['content']);
      expect(result).toBe('{"content": "Hello\\nWorld"}');
    });

    it('既にエスケープされた改行は変更しない', () => {
      const input = '{"content":"Hello\\nWorld"}';
      const result = escapeNewlinesInJsonFields(input, ['content']);
      expect(result).toBe('{"content":"Hello\\nWorld"}');
    });

    it('エスケープされたバックスラッシュと改行が混在する場合を正しく処理する', () => {
      const input = '{"content":"Hello\\\\nWorld"}';
      const result = escapeNewlinesInJsonFields(input, ['content']);
      expect(result).toBe('{"content":"Hello\\\\nWorld"}');
    });

    it('改行がないフィールドはそのまま返す', () => {
      const input = '{"content":"Hello World"}';
      const result = escapeNewlinesInJsonFields(input, ['content']);
      expect(result).toBe('{"content":"Hello World"}');
    });
  });

  describe('境界値', () => {
    it('空文字列を処理する', () => {
      const result = escapeNewlinesInJsonFields('', ['content']);
      expect(result).toBe('');
    });

    it('空のフィールド配列を処理する', () => {
      const input = '{"content":"Hello\nWorld"}';
      const result = escapeNewlinesInJsonFields(input, []);
      expect(result).toBe('{"content":"Hello\nWorld"}');
    });

    it('空の値を持つフィールドを処理する', () => {
      const input = '{"content":""}';
      const result = escapeNewlinesInJsonFields(input, ['content']);
      expect(result).toBe('{"content":""}');
    });

    it('存在しないフィールドを指定した場合はそのまま返す', () => {
      const input = '{"content":"Hello\nWorld"}';
      const result = escapeNewlinesInJsonFields(input, ['nonexistent']);
      expect(result).toBe('{"content":"Hello\nWorld"}');
    });

    it('同じフィールドが複数回出現する場合すべてエスケープする', () => {
      const input = '{"content":"Hello\nWorld","nested":{"content":"Foo\nBar"}}';
      const result = escapeNewlinesInJsonFields(input, ['content']);
      expect(result).toBe('{"content":"Hello\\nWorld","nested":{"content":"Foo\\nBar"}}');
    });
  });
});
