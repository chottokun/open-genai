import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useLocalStorageBoolean } from '../../src/hooks/useLocalStorageBoolean';

describe('useLocalStorageBoolean', () => {
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

  it('returns default value as boolean when localStorage is empty', () => {
    const { result: resultTrue } = renderHook(() => useLocalStorageBoolean('testKey1', true));
    const { result: resultFalse } = renderHook(() => useLocalStorageBoolean('testKey2', false));

    expect(resultTrue.current[0]).toBe(true);
    expect(resultFalse.current[0]).toBe(false);
  });

  it('returns true when localStorage has "true" string', () => {
    mockLocalStorage['testKey'] = 'true';

    const { result } = renderHook(() => useLocalStorageBoolean('testKey', false));

    expect(result.current[0]).toBe(true);
  });

  it('returns false when localStorage has "false" string', () => {
    mockLocalStorage['testKey'] = 'false';

    const { result } = renderHook(() => useLocalStorageBoolean('testKey', true));

    expect(result.current[0]).toBe(false);
  });

  it('returns false when localStorage has non-"true" string', () => {
    mockLocalStorage['testKey'] = 'invalid';

    const { result } = renderHook(() => useLocalStorageBoolean('testKey', true));

    // 'invalid' === 'true' is false
    expect(result.current[0]).toBe(false);
  });

  it('updates value to true and stores "true" string', () => {
    const { result } = renderHook(() => useLocalStorageBoolean('testKey', false));

    act(() => {
      result.current[1](true);
    });

    expect(result.current[0]).toBe(true);
    expect(mockLocalStorage['testKey']).toBe('true');
  });

  it('updates value to false and stores "false" string', () => {
    const { result } = renderHook(() => useLocalStorageBoolean('testKey', true));

    act(() => {
      result.current[1](false);
    });

    expect(result.current[0]).toBe(false);
    expect(mockLocalStorage['testKey']).toBe('false');
  });

  it('toggles value correctly', () => {
    const { result } = renderHook(() => useLocalStorageBoolean('testKey', false));

    expect(result.current[0]).toBe(false);

    act(() => {
      result.current[1](true);
    });
    expect(result.current[0]).toBe(true);

    act(() => {
      result.current[1](false);
    });
    expect(result.current[0]).toBe(false);

    act(() => {
      result.current[1](true);
    });
    expect(result.current[0]).toBe(true);
  });

  it('handles different keys independently', () => {
    const { result: result1 } = renderHook(() => useLocalStorageBoolean('key1', true));
    const { result: result2 } = renderHook(() => useLocalStorageBoolean('key2', false));

    act(() => {
      result1.current[1](false);
    });

    expect(result1.current[0]).toBe(false);
    expect(result2.current[0]).toBe(false);
    expect(mockLocalStorage['key1']).toBe('false');
    expect(mockLocalStorage['key2']).toBeUndefined();
  });

  it('returns boolean type, not string', () => {
    const { result } = renderHook(() => useLocalStorageBoolean('testKey', true));

    expect(typeof result.current[0]).toBe('boolean');

    act(() => {
      result.current[1](false);
    });

    expect(typeof result.current[0]).toBe('boolean');
  });
});
