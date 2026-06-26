import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useLiveStatusMessage } from '../../src/hooks/useLiveStatusMessage';

type Props = Parameters<typeof useLiveStatusMessage>[0];

const createDefaultProps = (overrides?: Partial<Props>): Props => ({
  active: true,
  loading: false,
  startDelay: 0,
  messages: {
    loading: 'AIが回答を生成しています...',
    loadingContinue: 'AIが引き続き回答を生成しています...',
    completed: 'AIの回答：テスト回答です',
    empty: 'AIの回答がありません。',
  },
  ...overrides,
});

describe('useLiveStatusMessage', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('active が false の場合はメッセージを設定しない', () => {
    const { result, rerender } = renderHook(
      (props: Props) => useLiveStatusMessage(props),
      { initialProps: createDefaultProps({ active: false, loading: false }) },
    );

    rerender(createDefaultProps({ active: false, loading: true }));

    expect(result.current.liveStatusMessage).toBe('');
  });

  it('ローディング開始時に生成中メッセージを表示する', () => {
    const { result, rerender } = renderHook(
      (props: Props) => useLiveStatusMessage(props),
      { initialProps: createDefaultProps({ loading: false }) },
    );

    rerender(createDefaultProps({ loading: true }));

    expect(result.current.liveStatusMessage).toBe('AIが回答を生成しています...');
  });

  it('カスタムメッセージを表示する', () => {
    const customMessages = {
      loading: 'AIが画像を生成しています...',
      loadingContinue: 'AIが引き続き画像を生成しています...',
      completed: '画像の生成が完了しました',
    };

    const { result, rerender } = renderHook(
      (props: Props) => useLiveStatusMessage(props),
      {
        initialProps: createDefaultProps({
          loading: false,
          messages: customMessages,
        }),
      },
    );

    rerender(createDefaultProps({ loading: true, messages: customMessages }));
    expect(result.current.liveStatusMessage).toBe('AIが画像を生成しています...');

    rerender(createDefaultProps({ loading: false, messages: customMessages }));
    expect(result.current.liveStatusMessage).toBe('画像の生成が完了しました');
  });

  it('5秒後に継続メッセージを表示する', () => {
    const { result, rerender } = renderHook(
      (props: Props) => useLiveStatusMessage(props),
      { initialProps: createDefaultProps({ loading: false }) },
    );

    rerender(createDefaultProps({ loading: true }));
    expect(result.current.liveStatusMessage).toBe('AIが回答を生成しています...');

    // 5秒後にintervalが発火し、一度空文字になる
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(result.current.liveStatusMessage).toBe('');

    // 100ms後に継続メッセージが設定される
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(result.current.liveStatusMessage).toBe('AIが引き続き回答を生成しています...');

    // 2秒後にクリアされる
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(result.current.liveStatusMessage).toBe('');
  });

  it('継続メッセージは5秒おきに繰り返し読み上げられる', () => {
    const { result, rerender } = renderHook(
      (props: Props) => useLiveStatusMessage(props),
      { initialProps: createDefaultProps({ loading: false }) },
    );

    rerender(createDefaultProps({ loading: true }));

    // 1回目の継続メッセージ（5秒 + 100ms）
    act(() => {
      vi.advanceTimersByTime(5100);
    });
    expect(result.current.liveStatusMessage).toBe('AIが引き続き回答を生成しています...');

    // 2回目も5秒後
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(result.current.liveStatusMessage).toBe('AIが引き続き回答を生成しています...');

    // 3回目も5秒後
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(result.current.liveStatusMessage).toBe('AIが引き続き回答を生成しています...');
  });

  describe('ローディング完了時', () => {
    it('completed メッセージを表示する', () => {
      const { result, rerender } = renderHook(
        (props: Props) => useLiveStatusMessage(props),
        { initialProps: createDefaultProps({ loading: false }) },
      );

      rerender(createDefaultProps({ loading: true }));
      rerender(createDefaultProps({ loading: false }));

      expect(result.current.liveStatusMessage).toBe('AIの回答：テスト回答です');
    });

    it('error がある場合はエラーメッセージを表示する', () => {
      const { result, rerender } = renderHook(
        (props: Props) => useLiveStatusMessage(props),
        { initialProps: createDefaultProps({ loading: false }) },
      );

      const messagesWithError = {
        loading: 'AIが回答を生成しています...',
        loadingContinue: 'AIが引き続き回答を生成しています...',
        completed: 'AIの回答：テスト回答',
        error: 'AIのエラー：エラーが発生しました',
      };

      rerender(createDefaultProps({ loading: true }));
      rerender(createDefaultProps({ loading: false, messages: messagesWithError }));

      expect(result.current.liveStatusMessage).toBe('AIのエラー：エラーが発生しました');
    });

    it('empty メッセージが設定されている場合に表示する', () => {
      const emptyMessages = {
        loading: 'AIが回答を生成しています...',
        loadingContinue: 'AIが引き続き回答を生成しています...',
        completed: '',
        empty: 'AIの回答がありません。',
      };

      const { result, rerender } = renderHook(
        (props: Props) => useLiveStatusMessage(props),
        { initialProps: createDefaultProps({ loading: false, messages: emptyMessages }) },
      );

      rerender(createDefaultProps({ loading: true, messages: emptyMessages }));
      rerender(createDefaultProps({ loading: false, messages: emptyMessages }));

      expect(result.current.liveStatusMessage).toBe('AIの回答がありません。');
    });

    it('完了メッセージは5秒後にクリアされる', () => {
      const { result, rerender } = renderHook(
        (props: Props) => useLiveStatusMessage(props),
        { initialProps: createDefaultProps({ loading: false }) },
      );

      rerender(createDefaultProps({ loading: true }));
      rerender(createDefaultProps({ loading: false }));

      expect(result.current.liveStatusMessage).toBe('AIの回答：テスト回答です');

      act(() => {
        vi.advanceTimersByTime(5000);
      });

      expect(result.current.liveStatusMessage).toBe('');
    });
  });

  describe('startDelay', () => {
    it('startDelay が指定されている場合、遅延後に開始メッセージを表示する', () => {
      const { result, rerender } = renderHook(
        (props: Props) => useLiveStatusMessage(props),
        {
          initialProps: createDefaultProps({
            loading: false,
            startDelay: 1000,
          }),
        },
      );

      rerender(createDefaultProps({ loading: true, startDelay: 1000 }));

      // 遅延前はメッセージなし
      expect(result.current.liveStatusMessage).toBe('');

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(result.current.liveStatusMessage).toBe('AIが回答を生成しています...');
    });

    it('startDelay 中にローディングが完了した場合、開始メッセージはスキップされる', () => {
      const { result, rerender } = renderHook(
        (props: Props) => useLiveStatusMessage(props),
        {
          initialProps: createDefaultProps({
            loading: false,
            startDelay: 2000,
          }),
        },
      );

      rerender(createDefaultProps({ loading: true, startDelay: 2000 }));

      const completedMessages = {
        loading: 'AIが回答を生成しています...',
        loadingContinue: 'AIが引き続き回答を生成しています...',
        completed: 'AIの回答：素早い回答',
      };

      // 遅延中にローディング完了
      rerender(
        createDefaultProps({
          loading: false,
          startDelay: 2000,
          messages: completedMessages,
        }),
      );

      expect(result.current.liveStatusMessage).toBe('AIの回答：素早い回答');

      // 遅延タイマーが発火しても開始メッセージに上書きされない
      act(() => {
        vi.advanceTimersByTime(2000);
      });

      expect(result.current.liveStatusMessage).toBe('AIの回答：素早い回答');
    });
  });

  it('loading 中の再レンダリングではタイマーがリセットされない', () => {
    const { result, rerender } = renderHook(
      (props: Props) => useLiveStatusMessage(props),
      { initialProps: createDefaultProps({ loading: false }) },
    );

    rerender(createDefaultProps({ loading: true }));

    expect(result.current.liveStatusMessage).toBe('AIが回答を生成しています...');

    // loading のまま再レンダリングしても開始メッセージのタイマーは維持される
    rerender(createDefaultProps({ loading: true }));

    expect(result.current.liveStatusMessage).toBe('AIが回答を生成しています...');

    // 5秒後+100msで継続メッセージが表示される（タイマーがリセットされていない証拠）
    act(() => {
      vi.advanceTimersByTime(5100);
    });

    expect(result.current.liveStatusMessage).toBe('AIが引き続き回答を生成しています...');
  });

  it('アンマウント時にタイマーがクリアされる', () => {
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');

    const { rerender, unmount } = renderHook(
      (props: Props) => useLiveStatusMessage(props),
      { initialProps: createDefaultProps({ loading: false }) },
    );

    rerender(createDefaultProps({ loading: true }));

    clearTimeoutSpy.mockClear();
    unmount();

    expect(clearTimeoutSpy).toHaveBeenCalled();
    clearTimeoutSpy.mockRestore();
  });

  it('loading 中に active が false になるとタイマーがクリアされメッセージが空になる', () => {
    const { result, rerender } = renderHook(
      (props: Props) => useLiveStatusMessage(props),
      { initialProps: createDefaultProps({ active: true, loading: false }) },
    );

    // ローディング開始
    rerender(createDefaultProps({ active: true, loading: true }));
    expect(result.current.liveStatusMessage).toBe('AIが回答を生成しています...');

    // active を false に切り替え
    rerender(createDefaultProps({ active: false, loading: true }));
    expect(result.current.liveStatusMessage).toBe('');

    // 継続メッセージのタイマーも停止していること
    act(() => {
      vi.advanceTimersByTime(5100);
    });
    expect(result.current.liveStatusMessage).toBe('');
  });

  it('active が false→true に戻った後、loading の変化を正しく検出する', () => {
    const { result, rerender } = renderHook(
      (props: Props) => useLiveStatusMessage(props),
      { initialProps: createDefaultProps({ active: true, loading: false }) },
    );

    // ローディング開始
    rerender(createDefaultProps({ active: true, loading: true }));
    expect(result.current.liveStatusMessage).toBe('AIが回答を生成しています...');

    // active を false に
    rerender(createDefaultProps({ active: false, loading: true }));
    expect(result.current.liveStatusMessage).toBe('');

    // active を true に戻し、loading: false で完了を検出できるか
    // prevLoadingRef がリセットされているので loading: true → false の遷移を再度検出するために
    // まず loading: true で再開始
    rerender(createDefaultProps({ active: true, loading: true }));
    expect(result.current.liveStatusMessage).toBe('AIが回答を生成しています...');

    const completedMessages = {
      loading: 'AIが回答を生成しています...',
      loadingContinue: 'AIが引き続き回答を生成しています...',
      completed: 'AIの回答：復帰後の回答',
    };

    rerender(createDefaultProps({ active: true, loading: false, messages: completedMessages }));
    expect(result.current.liveStatusMessage).toBe('AIの回答：復帰後の回答');
  });

  it('ローディングが連続して開始・停止・開始した場合に正しく動作する', () => {
    const { result, rerender } = renderHook(
      (props: Props) => useLiveStatusMessage(props),
      { initialProps: createDefaultProps({ loading: false }) },
    );

    // 1回目のローディング開始
    rerender(createDefaultProps({ loading: true }));
    expect(result.current.liveStatusMessage).toBe('AIが回答を生成しています...');

    const firstCompleted = {
      loading: 'AIが回答を生成しています...',
      loadingContinue: 'AIが引き続き回答を生成しています...',
      completed: 'AIの回答：1回目の回答',
    };

    // 1回目のローディング完了
    rerender(createDefaultProps({ loading: false, messages: firstCompleted }));
    expect(result.current.liveStatusMessage).toBe('AIの回答：1回目の回答');

    // 2回目のローディング開始
    rerender(createDefaultProps({ loading: true }));
    expect(result.current.liveStatusMessage).toBe('AIが回答を生成しています...');

    const secondCompleted = {
      loading: 'AIが回答を生成しています...',
      loadingContinue: 'AIが引き続き回答を生成しています...',
      completed: 'AIの回答：2回目の回答',
    };

    // 2回目のローディング完了
    rerender(createDefaultProps({ loading: false, messages: secondCompleted }));
    expect(result.current.liveStatusMessage).toBe('AIの回答：2回目の回答');
  });
});
