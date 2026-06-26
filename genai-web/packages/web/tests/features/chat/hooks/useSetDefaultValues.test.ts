import { renderHook } from '@testing-library/react';
import type { SystemContext } from 'genai-web';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useSetDefaultValues } from '../../../../src/features/chat/hooks/useSetDefaultValues';

const mockSetContent = vi.fn();
const mockSetInputSystemContext = vi.fn();
const mockSetSystemContextTitle = vi.fn();
const mockSetShouldAutoSubmit = vi.fn();
const mockSetHasSent = vi.fn();
const mockSetModelId = vi.fn();
const mockClear = vi.fn();
const mockGetCurrentSystemContext = vi.fn().mockReturnValue('default-system-context');
const mockUpdateSystemContext = vi.fn();
const mockGetModelId = vi.fn().mockReturnValue('model-1');

vi.mock('react-router', () => ({
  useLocation: vi.fn(),
  useParams: vi.fn().mockReturnValue({ chatId: undefined }),
}));

vi.mock('@/features/chat/stores/useChatStore', () => ({
  useChatStore: () => ({
    setContent: mockSetContent,
    setInputSystemContext: mockSetInputSystemContext,
    setSystemContextTitle: mockSetSystemContextTitle,
    setShouldAutoSubmit: mockSetShouldAutoSubmit,
    setHasSent: mockSetHasSent,
  }),
}));

vi.mock('@/hooks/useChat', () => ({
  useChat: () => ({
    getModelId: mockGetModelId,
    setModelId: mockSetModelId,
    clear: mockClear,
    getCurrentSystemContext: mockGetCurrentSystemContext,
    updateSystemContext: mockUpdateSystemContext,
  }),
}));

vi.mock('@/models', () => ({
  MODELS: {
    modelIds: ['model-1', 'model-2', 'model-3'],
  },
}));

vi.mock('@/features/landing/constants', () => ({
  TOP_CHAT_SYSTEM_PROMPT: 'top-chat-system-prompt',
  TOP_CHAT_SYSTEM_PROMPT_TITLE: 'トップチャットAI',
}));

describe('useSetDefaultValues', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('when search is empty', () => {
    it('sets shouldAutoSubmit to false', async () => {
      const { useLocation } = await import('react-router');
      vi.mocked(useLocation).mockReturnValue({
        pathname: '/chat',
        search: '',
        hash: '',
        state: null,
        key: 'default',
        unstable_mask: undefined,
      });

      renderHook(() => useSetDefaultValues([]));

      expect(mockSetShouldAutoSubmit).toHaveBeenCalledWith(false);
    });

    it('sets default model id', async () => {
      const { useLocation } = await import('react-router');
      vi.mocked(useLocation).mockReturnValue({
        pathname: '/chat',
        search: '',
        hash: '',
        state: null,
        key: 'default',
        unstable_mask: undefined,
      });

      renderHook(() => useSetDefaultValues([]));

      expect(mockSetModelId).toHaveBeenCalled();
    });
  });

  describe('when autoSubmit parameter is provided', () => {
    it('sets shouldAutoSubmit to true when autoSubmit=true and content is provided', async () => {
      const { useLocation } = await import('react-router');
      vi.mocked(useLocation).mockReturnValue({
        pathname: '/chat',
        search: '?autoSubmit=true&content=test',
        hash: '',
        state: null,
        key: 'default',
        unstable_mask: undefined,
      });

      renderHook(() => useSetDefaultValues([]));

      expect(mockSetShouldAutoSubmit).toHaveBeenCalledWith(true);
    });

    it('sets shouldAutoSubmit to false when autoSubmit=true but content is empty', async () => {
      const { useLocation } = await import('react-router');
      vi.mocked(useLocation).mockReturnValue({
        pathname: '/chat',
        search: '?autoSubmit=true',
        hash: '',
        state: null,
        key: 'default',
        unstable_mask: undefined,
      });

      renderHook(() => useSetDefaultValues([]));

      expect(mockSetShouldAutoSubmit).toHaveBeenCalledWith(false);
    });

    it('sets shouldAutoSubmit to false when autoSubmit=false', async () => {
      const { useLocation } = await import('react-router');
      vi.mocked(useLocation).mockReturnValue({
        pathname: '/chat',
        search: '?autoSubmit=false',
        hash: '',
        state: null,
        key: 'default',
        unstable_mask: undefined,
      });

      renderHook(() => useSetDefaultValues([]));

      expect(mockSetShouldAutoSubmit).toHaveBeenCalledWith(false);
    });

    it('sets shouldAutoSubmit to false when autoSubmit is not provided', async () => {
      const { useLocation } = await import('react-router');
      vi.mocked(useLocation).mockReturnValue({
        pathname: '/chat',
        search: '?content=test',
        hash: '',
        state: null,
        key: 'default',
        unstable_mask: undefined,
      });

      renderHook(() => useSetDefaultValues([]));

      expect(mockSetShouldAutoSubmit).toHaveBeenCalledWith(false);
    });
  });

  describe('when content parameter is provided', () => {
    it('sets content from query parameter', async () => {
      const { useLocation } = await import('react-router');
      vi.mocked(useLocation).mockReturnValue({
        pathname: '/chat',
        search: '?content=テストメッセージ',
        hash: '',
        state: null,
        key: 'default',
        unstable_mask: undefined,
      });

      renderHook(() => useSetDefaultValues([]));

      expect(mockSetContent).toHaveBeenCalledWith('テストメッセージ');
    });

    it('sets empty content when content parameter is not provided', async () => {
      const { useLocation } = await import('react-router');
      vi.mocked(useLocation).mockReturnValue({
        pathname: '/chat',
        search: '?autoSubmit=true',
        hash: '',
        state: null,
        key: 'default',
        unstable_mask: undefined,
      });

      renderHook(() => useSetDefaultValues([]));

      expect(mockSetContent).toHaveBeenCalledWith('');
    });
  });

  describe('when systemContext parameter is provided', () => {
    it('updates system context and sets input system context', async () => {
      const { useLocation } = await import('react-router');
      vi.mocked(useLocation).mockReturnValue({
        pathname: '/chat',
        search: '?systemContext=カスタムプロンプト',
        hash: '',
        state: null,
        key: 'default',
        unstable_mask: undefined,
      });

      renderHook(() => useSetDefaultValues([]));

      expect(mockUpdateSystemContext).toHaveBeenCalledWith('カスタムプロンプト');
      expect(mockSetInputSystemContext).toHaveBeenCalledWith('カスタムプロンプト');
    });

    it('clears and sets default system context when systemContext is not provided', async () => {
      const { useLocation } = await import('react-router');
      vi.mocked(useLocation).mockReturnValue({
        pathname: '/chat',
        search: '?content=test',
        hash: '',
        state: null,
        key: 'default',
        unstable_mask: undefined,
      });

      renderHook(() => useSetDefaultValues([]));

      expect(mockClear).toHaveBeenCalled();
      expect(mockSetInputSystemContext).toHaveBeenCalledWith('default-system-context');
    });
  });

  describe('when autoSubmit is provided via state', () => {
    it('sets shouldAutoSubmit to true when state.autoSubmit=true and content is provided', async () => {
      const { useLocation } = await import('react-router');
      vi.mocked(useLocation).mockReturnValue({
        pathname: '/chat',
        search: '',
        hash: '',
        state: { content: 'テスト', systemContext: 'プロンプト', autoSubmit: true },
        key: 'default',
        unstable_mask: undefined,
      });

      renderHook(() => useSetDefaultValues([]));

      expect(mockSetShouldAutoSubmit).toHaveBeenCalledWith(true);
      expect(mockSetContent).toHaveBeenCalledWith('テスト');
    });

    it('sets shouldAutoSubmit to false when state.autoSubmit is not provided', async () => {
      const { useLocation } = await import('react-router');
      vi.mocked(useLocation).mockReturnValue({
        pathname: '/chat',
        search: '',
        hash: '',
        state: { content: 'テスト', systemContext: 'プロンプト' },
        key: 'default',
        unstable_mask: undefined,
      });

      renderHook(() => useSetDefaultValues([]));

      expect(mockSetShouldAutoSubmit).toHaveBeenCalledWith(false);
    });
  });

  describe('when all parameters are provided', () => {
    it('sets all values correctly', async () => {
      const { useLocation } = await import('react-router');
      vi.mocked(useLocation).mockReturnValue({
        pathname: '/chat',
        search: '?content=テスト&systemContext=プロンプト&autoSubmit=true',
        hash: '',
        state: null,
        key: 'default',
        unstable_mask: undefined,
      });

      renderHook(() => useSetDefaultValues([]));

      expect(mockSetContent).toHaveBeenCalledWith('テスト');
      expect(mockUpdateSystemContext).toHaveBeenCalledWith('プロンプト');
      expect(mockSetInputSystemContext).toHaveBeenCalledWith('プロンプト');
      expect(mockSetShouldAutoSubmit).toHaveBeenCalledWith(true);
    });
  });

  describe('system context title resolution on existing chat', () => {
    it('resolves title from TOP_CHAT_SYSTEM_PROMPT when matching', async () => {
      const { useLocation, useParams } = await import('react-router');
      vi.mocked(useLocation).mockReturnValue({
        pathname: '/chat/chat-1',
        search: '',
        hash: '',
        state: null,
        key: 'default',
        unstable_mask: undefined,
      });
      vi.mocked(useParams).mockReturnValue({ chatId: 'chat-1' });
      mockGetCurrentSystemContext.mockReturnValue('top-chat-system-prompt');

      renderHook(() => useSetDefaultValues([]));

      expect(mockSetSystemContextTitle).toHaveBeenCalledWith('トップチャットAI');
    });

    it('resolves title from systemContextList when matching', async () => {
      const { useLocation, useParams } = await import('react-router');
      vi.mocked(useLocation).mockReturnValue({
        pathname: '/chat/chat-1',
        search: '',
        hash: '',
        state: null,
        key: 'default',
        unstable_mask: undefined,
      });
      vi.mocked(useParams).mockReturnValue({ chatId: 'chat-1' });
      mockGetCurrentSystemContext.mockReturnValue('saved-prompt-content');

      const systemContextList: SystemContext[] = [
        {
          id: 'id-1',
          createdDate: '2026-01-01',
          systemContextId: 'ctx-1',
          systemContext: 'saved-prompt-content',
          systemContextTitle: '保存済みプロンプト',
        },
      ];

      renderHook(() => useSetDefaultValues(systemContextList));

      expect(mockSetSystemContextTitle).toHaveBeenCalledWith('保存済みプロンプト');
    });

    it('sets empty title when system context does not match any prompt', async () => {
      const { useLocation, useParams } = await import('react-router');
      vi.mocked(useLocation).mockReturnValue({
        pathname: '/chat/chat-1',
        search: '',
        hash: '',
        state: null,
        key: 'default',
        unstable_mask: undefined,
      });
      vi.mocked(useParams).mockReturnValue({ chatId: 'chat-1' });
      mockGetCurrentSystemContext.mockReturnValue('unknown-prompt');

      renderHook(() => useSetDefaultValues([]));

      const titleCalls = mockSetSystemContextTitle.mock.calls;
      const lastCall = titleCalls[titleCalls.length - 1];
      expect(lastCall[0]).toBe('');
    });

    it('prioritizes TOP_CHAT_SYSTEM_PROMPT over systemContextList', async () => {
      const { useLocation, useParams } = await import('react-router');
      vi.mocked(useLocation).mockReturnValue({
        pathname: '/chat/chat-1',
        search: '',
        hash: '',
        state: null,
        key: 'default',
        unstable_mask: undefined,
      });
      vi.mocked(useParams).mockReturnValue({ chatId: 'chat-1' });
      mockGetCurrentSystemContext.mockReturnValue('top-chat-system-prompt');

      const systemContextList: SystemContext[] = [
        {
          id: 'id-1',
          createdDate: '2026-01-01',
          systemContextId: 'ctx-1',
          systemContext: 'top-chat-system-prompt',
          systemContextTitle: '別のタイトル',
        },
      ];

      renderHook(() => useSetDefaultValues(systemContextList));

      expect(mockSetSystemContextTitle).toHaveBeenCalledWith('トップチャットAI');
    });

    it('does not resolve title for new chat (no chatId)', async () => {
      const { useLocation, useParams } = await import('react-router');
      vi.mocked(useLocation).mockReturnValue({
        pathname: '/chat',
        search: '',
        hash: '',
        state: null,
        key: 'default',
        unstable_mask: undefined,
      });
      vi.mocked(useParams).mockReturnValue({ chatId: undefined });
      mockGetCurrentSystemContext.mockReturnValue('top-chat-system-prompt');

      renderHook(() => useSetDefaultValues([]));

      // 新規チャットではマッチングによるタイトル設定は行わない
      // （プロンプト一覧から選択した場合のタイトルを上書きしないため）
      expect(mockSetSystemContextTitle).not.toHaveBeenCalledWith('トップチャットAI');
    });

    it('clears title when navigating from existing chat to new chat', async () => {
      const { useLocation, useParams } = await import('react-router');
      vi.mocked(useLocation).mockReturnValue({
        pathname: '/chat/chat-1',
        search: '',
        hash: '',
        state: null,
        key: 'default',
        unstable_mask: undefined,
      });
      vi.mocked(useParams).mockReturnValue({ chatId: 'chat-1' });
      mockGetCurrentSystemContext.mockReturnValue('top-chat-system-prompt');

      const { rerender } = renderHook(() => useSetDefaultValues([]));

      vi.clearAllMocks();

      // 新規チャットに遷移
      vi.mocked(useLocation).mockReturnValue({
        pathname: '/chat',
        search: '',
        hash: '',
        state: null,
        key: 'default',
        unstable_mask: undefined,
      });
      vi.mocked(useParams).mockReturnValue({ chatId: undefined });
      mockGetCurrentSystemContext.mockReturnValue('');

      rerender();

      expect(mockSetSystemContextTitle).toHaveBeenCalledWith('');
    });

    it('clears title immediately when navigating between existing chats before restore completes', async () => {
      const { useLocation, useParams } = await import('react-router');
      vi.mocked(useLocation).mockReturnValue({
        pathname: '/chat/chat-1',
        search: '',
        hash: '',
        state: null,
        key: 'default',
        unstable_mask: undefined,
      });
      vi.mocked(useParams).mockReturnValue({ chatId: 'chat-1' });
      mockGetCurrentSystemContext.mockReturnValue('top-chat-system-prompt');

      const { rerender } = renderHook(() => useSetDefaultValues([]));

      expect(mockSetSystemContextTitle).toHaveBeenCalledWith('トップチャットAI');
      vi.clearAllMocks();

      // chat-2 に遷移（restore 完了前は currentSystemContext が空）
      vi.mocked(useLocation).mockReturnValue({
        pathname: '/chat/chat-2',
        search: '',
        hash: '',
        state: null,
        key: 'default',
        unstable_mask: undefined,
      });
      vi.mocked(useParams).mockReturnValue({ chatId: 'chat-2' });
      mockGetCurrentSystemContext.mockReturnValue('');

      rerender();

      // restore 完了前にタイトルがクリアされること
      expect(mockSetSystemContextTitle).toHaveBeenCalledWith('');
    });
  });

  describe('when chatId changes', () => {
    it('re-executes setModelId when navigating to different chat via sidebar (no state, no search)', async () => {
      const { useLocation, useParams } = await import('react-router');
      vi.mocked(useLocation).mockReturnValue({
        pathname: '/chat/chat-1',
        search: '',
        hash: '',
        state: null,
        key: 'default',
        unstable_mask: undefined,
      });
      vi.mocked(useParams).mockReturnValue({ chatId: 'chat-1' });

      const { rerender } = renderHook(() => useSetDefaultValues([]));

      expect(mockSetModelId).toHaveBeenCalledTimes(1);
      vi.clearAllMocks();

      vi.mocked(useLocation).mockReturnValue({
        pathname: '/chat/chat-2',
        search: '',
        hash: '',
        state: null,
        key: 'default',
        unstable_mask: undefined,
      });
      vi.mocked(useParams).mockReturnValue({ chatId: 'chat-2' });

      rerender();

      expect(mockSetModelId).toHaveBeenCalledTimes(1);
    });
  });
});
