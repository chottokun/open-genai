import { describe, expect, it } from 'vitest';
import { decomposeId } from '../../src/utils/decomposeId';

describe('decomposeId', () => {
  it('returns the part after # when usecaseId contains #', () => {
    expect(decomposeId('prefix#suffix')).toBe('suffix');
  });

  it('returns null when usecaseId does not contain #', () => {
    expect(decomposeId('no-hash-here')).toBeNull();
  });

  it('returns empty string when # is at the end', () => {
    expect(decomposeId('prefix#')).toBe('');
  });

  it('returns the first part after # when there are multiple #', () => {
    expect(decomposeId('a#b#c')).toBe('b');
  });

  it('returns null for empty string', () => {
    expect(decomposeId('')).toBeNull();
  });

  it('handles # at the beginning', () => {
    expect(decomposeId('#suffix')).toBe('suffix');
  });

  it('handles complex usecaseId format', () => {
    expect(decomposeId('chat#abc123')).toBe('abc123');
    expect(decomposeId('exapp#app-456')).toBe('app-456');
  });
});
