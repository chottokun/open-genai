import { render } from '@testing-library/react';
import { InvokeExAppHistory, InvokeExAppResponse } from 'genai-web';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ContinueConversationButton } from '../../../../src/features/exapp/components/ContinueConversationButton.tsx';

vi.mock('../../../../src/features/exapp/stores/useExAppInvokeStore.ts');
vi.mock('../../../../src/features/exapp/hooks/useExAppInvokedHistories.ts');
vi.mock('react-router', () => ({
  useParams: () => ({ teamId: 'team1', exAppId: 'app1' }),
}));

describe('ContinueConversationButton', () => {
  const createMockExAppResponse = (
    overrides?: Partial<InvokeExAppResponse>,
  ): InvokeExAppResponse => ({
    outputs: 'テスト出力結果',
    artifacts: [],
    timestamps: {
      processingStartedAt: '2025-01-01T00:00:00Z',
      processingEndedAt: '2025-01-01T00:00:01Z',
    },
    ...overrides,
  });

  const createMockHistory = (overrides?: Partial<InvokeExAppHistory>): InvokeExAppHistory =>
    ({
      status: 'COMPLETED',
      teamId: 'team1',
      exAppId: 'app1',
      ...overrides,
    }) as InvokeExAppHistory;

  const defaultStoreValue = {
    exAppResponse: null,
    setExAppResponse: vi.fn(),
    requestLoading: false,
    setRequestLoading: vi.fn(),
    error: null,
    setError: vi.fn(),
    shouldReset: false,
    setShouldReset: vi.fn(),
    clear: vi.fn(),
  };

  const mockUseExAppInvokeStore = vi.fn();
  const mockUseExAppInvokedHistories = vi.fn();

  beforeEach(async () => {
    vi.clearAllMocks();

    mockUseExAppInvokeStore.mockReturnValue(defaultStoreValue);
    mockUseExAppInvokedHistories.mockReturnValue({ latestHistory: undefined });

    const storeModule = await import(
      '../../../../src/features/exapp/stores/useExAppInvokeStore.ts'
    );
    vi.mocked(storeModule.useExAppInvokeStore).mockImplementation(mockUseExAppInvokeStore);

    const historiesModule = await import(
      '../../../../src/features/exapp/hooks/useExAppInvokedHistories.ts'
    );
    vi.mocked(historiesModule.useExAppInvokedHistories).mockImplementation(
      mockUseExAppInvokedHistories,
    );
  });

  it('renders nothing when exAppResponse is null', () => {
    const { container } = render(<ContinueConversationButton />);

    expect(container.innerHTML).toBe('');
  });

  it('renders nothing when latestHistory status is not COMPLETED', () => {
    mockUseExAppInvokeStore.mockReturnValue({
      ...defaultStoreValue,
      exAppResponse: createMockExAppResponse(),
    });
    mockUseExAppInvokedHistories.mockReturnValue({
      latestHistory: createMockHistory({ status: 'IN_PROGRESS' }),
    });

    const { container } = render(<ContinueConversationButton />);

    expect(container.innerHTML).toBe('');
  });

  it('renders button when exAppResponse exists and latestHistory is COMPLETED', () => {
    mockUseExAppInvokeStore.mockReturnValue({
      ...defaultStoreValue,
      exAppResponse: createMockExAppResponse(),
    });
    mockUseExAppInvokedHistories.mockReturnValue({
      latestHistory: createMockHistory({ status: 'COMPLETED' }),
    });

    const { getByText } = render(<ContinueConversationButton />);

    const button = getByText('会話を続ける');
    expect(button).toBeDefined();
    expect(button.tagName).toEqual('BUTTON');
  });
});
