import type { InvokeExAppHistory } from 'genai-web';
import { describe, expect, it } from 'vitest';
import { buildPayload } from '../../../../src/features/exapp/utils/buildPayload';

describe('buildPayload', () => {
  describe('基本的なデータの処理', () => {
    it('データをそのままペイロードに含める', () => {
      const result = buildPayload({
        data: { message: 'Hello', count: 10 },
        files: [],
        invokeHistory: null,
      });

      expect(result.message).toBe('Hello');
      expect(result.count).toBe(10);
    });

    it('空のデータで空のペイロードを返す', () => {
      const result = buildPayload({
        data: {},
        files: [],
        invokeHistory: null,
      });

      expect(result).toEqual({});
    });
  });

  describe('ファイルの処理', () => {
    it('ファイルがある場合にペイロードに含める', () => {
      const files = [
        {
          key: 'document',
          files: [{ filename: 'test.pdf', content: 'base64content' }],
        },
      ];

      const result = buildPayload({
        data: { title: 'テスト' },
        files,
        invokeHistory: null,
      });

      expect(result.files).toEqual(files);
      expect(result.title).toBe('テスト');
    });

    it('ファイルが空の場合はfilesプロパティを含めない', () => {
      const result = buildPayload({
        data: { title: 'テスト' },
        files: [],
        invokeHistory: null,
      });

      expect(result.files).toBeUndefined();
    });

    it('複数のファイルグループを含める', () => {
      const files = [
        {
          key: 'images',
          files: [
            { filename: 'img1.png', content: 'content1' },
            { filename: 'img2.png', content: 'content2' },
          ],
        },
        {
          key: 'documents',
          files: [{ filename: 'doc.pdf', content: 'content3' }],
        },
      ];

      const result = buildPayload({
        data: {},
        files,
        invokeHistory: null,
      });

      expect(result.files).toEqual(files);
    });
  });

  describe('会話履歴の処理', () => {
    it('invokeHistoryがある場合に会話履歴を構築する', () => {
      const invokeHistory: InvokeExAppHistory = {
        teamId: 'team-1',
        teamName: '',
        exAppId: 'app-1',
        exAppName: '',
        userId: '',
        inputs: { question: 'こんにちは' },
        outputs: '回答です',
        createdDate: '2025-01-01T00:00:00Z',
        status: 'COMPLETED',
        progress: '',
      };

      const result = buildPayload({
        data: { newQuestion: '次の質問' },
        files: [],
        invokeHistory,
      });

      expect(result.conversation_histories).toBeDefined();
      const histories = result.conversation_histories as {
        input: string;
        output: string;
        createdDate: string;
      }[];
      expect(histories).toHaveLength(1);
      expect(histories[0]).toEqual({
        input: JSON.stringify({ question: 'こんにちは' }),
        output: '回答です',
        createdDate: '2025-01-01T00:00:00Z',
      });
    });

    it('既存の会話履歴がある場合にマージする', () => {
      const existingHistories = [
        {
          input: '{"question":"最初の質問"}',
          output: '最初の回答',
          createdDate: '2025-01-01T00:00:00Z',
        },
      ];

      const invokeHistory: InvokeExAppHistory = {
        teamId: 'team-1',
        teamName: '',
        exAppId: 'app-1',
        exAppName: '',
        userId: '',
        inputs: {
          question: '2番目の質問',
          conversation_histories: existingHistories,
        },
        outputs: '2番目の回答',
        createdDate: '2025-01-02T00:00:00Z',
        status: 'COMPLETED',
        progress: '',
      };

      const result = buildPayload({
        data: {},
        files: [],
        invokeHistory,
      });

      const histories = result.conversation_histories as {
        input: string;
        output: string;
        createdDate: string;
      }[];
      expect(histories).toHaveLength(2);
      expect(histories[0]).toEqual(existingHistories[0]);
      expect(histories[1].output).toBe('2番目の回答');
    });

    it('invokeHistoryがnullの場合は会話履歴を含めない', () => {
      const result = buildPayload({
        data: { question: 'テスト' },
        files: [],
        invokeHistory: null,
      });

      expect(result.conversation_histories).toBeUndefined();
    });
  });

  describe('システムプロンプトのプレースホルダー置換', () => {
    it('プレースホルダーをデータの値で置換する', () => {
      const result = buildPayload({
        data: {
          systemPrompt: 'あなたは{{role}}です。{{task}}を行ってください。',
          role: 'アシスタント',
          task: '翻訳',
        },
        files: [],
        invokeHistory: null,
        systemPromptKey: 'systemPrompt',
      });

      expect(result.systemPrompt).toBe('あなたはアシスタントです。翻訳を行ってください。');
    });

    it('存在しないプレースホルダーはそのまま残す', () => {
      const result = buildPayload({
        data: {
          systemPrompt: 'こんにちは{{name}}さん、{{greeting}}',
          name: '太郎',
        },
        files: [],
        invokeHistory: null,
        systemPromptKey: 'systemPrompt',
      });

      expect(result.systemPrompt).toBe('こんにちは太郎さん、{{greeting}}');
    });

    it('値がnullまたはundefinedの場合はプレースホルダーを残す', () => {
      const result = buildPayload({
        data: {
          systemPrompt: '{{value1}}と{{value2}}',
          value1: null,
          value2: undefined,
        },
        files: [],
        invokeHistory: null,
        systemPromptKey: 'systemPrompt',
      });

      expect(result.systemPrompt).toBe('{{value1}}と{{value2}}');
    });

    it('数値や真偽値も文字列として置換する', () => {
      const result = buildPayload({
        data: {
          systemPrompt: '回数: {{count}}, 有効: {{enabled}}',
          count: 42,
          enabled: true,
        },
        files: [],
        invokeHistory: null,
        systemPromptKey: 'systemPrompt',
      });

      expect(result.systemPrompt).toBe('回数: 42, 有効: true');
    });

    it('systemPromptKeyが指定されていない場合は置換しない', () => {
      const result = buildPayload({
        data: {
          systemPrompt: '{{placeholder}}',
          placeholder: '置換値',
        },
        files: [],
        invokeHistory: null,
      });

      expect(result.systemPrompt).toBe('{{placeholder}}');
    });

    it('systemPromptKeyに対応する値が存在しない場合は置換しない', () => {
      const result = buildPayload({
        data: {
          otherField: 'value',
        },
        files: [],
        invokeHistory: null,
        systemPromptKey: 'systemPrompt',
      });

      expect(result.systemPrompt).toBeUndefined();
    });

    it('プレースホルダーがない場合はそのまま返す', () => {
      const result = buildPayload({
        data: {
          systemPrompt: 'プレースホルダーなしのプロンプト',
        },
        files: [],
        invokeHistory: null,
        systemPromptKey: 'systemPrompt',
      });

      expect(result.systemPrompt).toBe('プレースホルダーなしのプロンプト');
    });
  });

  describe('複合ケース', () => {
    it('すべての要素を含むペイロードを構築する', () => {
      const files = [{ key: 'doc', files: [{ filename: 'test.txt', content: 'content' }] }];
      const invokeHistory: InvokeExAppHistory = {
        teamId: 't1',
        exAppId: 'a1',
        inputs: { q: '質問' },
        outputs: '回答',
        createdDate: '2025-01-01',
        status: 'COMPLETED',
        teamName: '',
        exAppName: '',
        userId: '',
        progress: '',
      };

      const result = buildPayload({
        data: {
          systemPrompt: '{{role}}として回答',
          role: 'エキスパート',
          question: '新しい質問',
        },
        files,
        invokeHistory,
        systemPromptKey: 'systemPrompt',
      });

      expect(result.systemPrompt).toBe('エキスパートとして回答');
      expect(result.role).toBe('エキスパート');
      expect(result.question).toBe('新しい質問');
      expect(result.files).toEqual(files);
      expect(result.conversation_histories).toHaveLength(1);
    });
  });
});
