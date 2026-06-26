import { describe, expect, test } from 'vitest';
import { authorizeOwnedKey, extractKeyOwner } from '../../../lambda/utils/fileOwnership';

describe('extractKeyOwner', () => {
  test('1段目を返す', () => {
    expect(extractKeyOwner('abc/def/ghi')).toBe('abc');
  });

  test('スラッシュなしでもそのまま返す', () => {
    expect(extractKeyOwner('onlyone')).toBe('onlyone');
  });

  test('空文字は undefined', () => {
    expect(extractKeyOwner('')).toBeUndefined();
  });

  test('先頭スラッシュは undefined 扱い', () => {
    expect(extractKeyOwner('/a/b')).toBeUndefined();
  });
});

describe('authorizeOwnedKey', () => {
  test('Identity Id が一致 → true', () => {
    const id = 'us-east-1:abcd1234-xxxx-xxxx-xxxx-xxxxxxxxxxxx';
    expect(authorizeOwnedKey(`${id}/uuid/file.png`, id)).toBe(true);
  });

  test('Identity Id が不一致 → false', () => {
    expect(
      authorizeOwnedKey(
        'us-east-1:attacker-xxxx-xxxx-xxxx-xxxxxxxxxxxx/uuid/file.png',
        'us-east-1:victim-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
      ),
    ).toBe(false);
  });

  test('空キーは false', () => {
    expect(authorizeOwnedKey('', 'us-east-1:abc')).toBe(false);
  });
});
