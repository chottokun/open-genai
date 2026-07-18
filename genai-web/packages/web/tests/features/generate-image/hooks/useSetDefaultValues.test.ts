import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { useSetDefaultValues } from '../../../../src/features/generate-image/hooks/useSetDefaultValues';
import { MODELS } from '../../../../src/models';

// react-router-dom / react-routerのモック
const mockUseLocation = vi.fn().mockReturnValue({ search: '' });
vi.mock('react-router', () => ({
  useLocation: () => mockUseLocation(),
}));

// カスタムフック・ストアのモック
const mockSetChatContent = vi.fn();
const mockSetImageGenModelId = vi.fn();
const mockSetModelId = vi.fn();
const mockGetModelId = vi.fn().mockReturnValue('');

vi.mock('@/hooks/useUsecasePath', () => ({
  useUsecasePath: () => ({ usecase: 'generate-image', chatId: '123' }),
}));

vi.mock('../../../../src/features/generate-image/stores/useGenerateImageStore', () => ({
  useGenerateImageStore: () => ({
    imageGenModelId: '',
    setChatContent: mockSetChatContent,
    setImageGenModelId: mockSetImageGenModelId,
  }),
}));

vi.mock('@/hooks/useChat', () => ({
  useChat: () => ({
    getModelId: mockGetModelId,
    setModelId: mockSetModelId,
  }),
}));

// MODELSモジュール全体のモック化
vi.mock('@/models', () => ({
  MODELS: {
    modelIds: ['model-a', 'model-b'],
    imageGenModelIds: ['img-model-a', 'img-model-b'],
  },
}));

describe('useSetDefaultValues hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseLocation.mockReturnValue({ search: '' });
    mockGetModelId.mockReturnValue('');
    MODELS.modelIds = ['model-a', 'model-b'];
    MODELS.imageGenModelIds = ['img-model-a', 'img-model-b'];
  });

  it('sets default models when no query parameters are present', () => {
    renderHook(() => useSetDefaultValues());

    expect(mockSetModelId).toHaveBeenCalledWith('model-a');
    expect(mockSetImageGenModelId).toHaveBeenCalledWith('img-model-a');
  });

  it('safely falls back to empty string when model list is empty', () => {
    // モデル配列を空にする境界値テスト
    MODELS.modelIds = [];
    MODELS.imageGenModelIds = [];

    renderHook(() => useSetDefaultValues());

    expect(mockSetModelId).toHaveBeenCalledWith('');
    expect(mockSetImageGenModelId).toHaveBeenCalledWith('');
  });

  it('updates state with valid query parameters', () => {
    mockUseLocation.mockReturnValue({
      search: '?content=test&modelId=model-b&imageModelId=img-model-b',
    });

    renderHook(() => useSetDefaultValues());

    expect(mockSetChatContent).toHaveBeenCalledWith('test');
    expect(mockSetModelId).toHaveBeenCalledWith('model-b');
    expect(mockSetImageGenModelId).toHaveBeenCalledWith('img-model-b');
  });

  it('falls back to default model when query parameter has invalid model ID', () => {
    mockUseLocation.mockReturnValue({
      search: '?content=test&modelId=invalid-model&imageModelId=invalid-img-model',
    });

    renderHook(() => useSetDefaultValues());

    expect(mockSetModelId).toHaveBeenCalledWith('model-a');
    expect(mockSetImageGenModelId).toHaveBeenCalledWith('img-model-a');
  });
});
