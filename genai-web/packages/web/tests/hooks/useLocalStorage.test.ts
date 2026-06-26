import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useLocalStorage } from '../../src/hooks/useLocalStorage';

describe('useLocalStorage', () => {
  const mockLocalStorage: Record<string, string> = {};

  beforeEach(() => {
    // localStorage のモック
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation((key: string) => {
      return mockLocalStorage[key] ?? null;
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation((key: string, value: string) => {
      mockLocalStorage[key] = value;
    });
  });

  afterEach(() => {
    // モックのクリア
    vi.restoreAllMocks();
    for (const key of Object.keys(mockLocalStorage)) {
      delete mockLocalStorage[key];
    }
  });

  it('returns default value when localStorage is empty', () => {
    const { result } = renderHook(() => useLocalStorage('testKey', 'defaultValue'));

    expect(result.current[0]).toBe('defaultValue');
  });

  it('returns stored value when localStorage has the key', () => {
    mockLocalStorage['testKey'] = 'storedValue';

    const { result } = renderHook(() => useLocalStorage('testKey', 'defaultValue'));

    expect(result.current[0]).toBe('storedValue');
  });

  it('updates value and localStorage when setValue is called', () => {
    const { result } = renderHook(() => useLocalStorage('testKey', 'defaultValue'));

    act(() => {
      result.current[1]('newValue');
    });

    expect(result.current[0]).toBe('newValue');
    expect(mockLocalStorage['testKey']).toBe('newValue');
  });

  it('updates value multiple times correctly', () => {
    const { result } = renderHook(() => useLocalStorage('testKey', 'defaultValue'));

    act(() => {
      result.current[1]('firstValue');
    });
    expect(result.current[0]).toBe('firstValue');

    act(() => {
      result.current[1]('secondValue');
    });
    expect(result.current[0]).toBe('secondValue');
    expect(mockLocalStorage['testKey']).toBe('secondValue');
  });

  it('handles empty string as value', () => {
    const { result } = renderHook(() => useLocalStorage('testKey', 'defaultValue'));

    act(() => {
      result.current[1]('');
    });

    expect(result.current[0]).toBe('');
    expect(mockLocalStorage['testKey']).toBe('');
  });

  it('handles different keys independently', () => {
    const { result: result1 } = renderHook(() => useLocalStorage('key1', 'default1'));
    const { result: result2 } = renderHook(() => useLocalStorage('key2', 'default2'));

    act(() => {
      result1.current[1]('value1');
    });

    expect(result1.current[0]).toBe('value1');
    expect(result2.current[0]).toBe('default2');
    expect(mockLocalStorage['key1']).toBe('value1');
    expect(mockLocalStorage['key2']).toBeUndefined();
  });

  it('handles Japanese characters', () => {
    const { result } = renderHook(() => useLocalStorage('testKey', 'デフォルト'));

    expect(result.current[0]).toBe('デフォルト');

    act(() => {
      result.current[1]('新しい値');
    });

    expect(result.current[0]).toBe('新しい値');
    expect(mockLocalStorage['testKey']).toBe('新しい値');
  });

  it('handles special characters in key', () => {
    const specialKey = 'test:key:with:colons';
    const { result } = renderHook(() => useLocalStorage(specialKey, 'defaultValue'));

    act(() => {
      result.current[1]('newValue');
    });

    expect(result.current[0]).toBe('newValue');
    expect(mockLocalStorage[specialKey]).toBe('newValue');
  });
});
