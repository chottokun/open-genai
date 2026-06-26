import { beforeEach, describe, expect, it, vi } from 'vitest';

const createKeyEvent = (
  overrides: Partial<Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'metaKey'>> = {},
): Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'metaKey'> => ({
  key: 'Enter',
  ctrlKey: false,
  metaKey: false,
  ...overrides,
});

describe('keyboard utils', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  describe('macOS', () => {
    beforeEach(() => {
      vi.stubGlobal(
        'navigator',
        Object.create(navigator, {
          userAgent: {
            value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          },
        }),
      );
    });

    it('submitModifierLabel は "Command" を返す', async () => {
      const { submitModifierLabel } = await import('../../src/utils/keyboard');
      expect(submitModifierLabel).toBe('Command');
    });

    it('Cmd+Enter で isSubmitKey が true を返す', async () => {
      const { isSubmitKey } = await import('../../src/utils/keyboard');
      expect(isSubmitKey(createKeyEvent({ metaKey: true }))).toBe(true);
    });

    it('Ctrl+Enter で isSubmitKey が false を返す', async () => {
      const { isSubmitKey } = await import('../../src/utils/keyboard');
      expect(isSubmitKey(createKeyEvent({ ctrlKey: true }))).toBe(false);
    });

    it('Enter のみで isSubmitKey が false を返す', async () => {
      const { isSubmitKey } = await import('../../src/utils/keyboard');
      expect(isSubmitKey(createKeyEvent())).toBe(false);
    });

    it('Cmd+Enter 以外のキーで isSubmitKey が false を返す', async () => {
      const { isSubmitKey } = await import('../../src/utils/keyboard');
      expect(isSubmitKey(createKeyEvent({ key: 'a', metaKey: true }))).toBe(false);
    });
  });

  describe('Windows/Linux', () => {
    beforeEach(() => {
      vi.stubGlobal(
        'navigator',
        Object.create(navigator, {
          userAgent: {
            value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
        }),
      );
    });

    it('submitModifierLabel は "Ctrl" を返す', async () => {
      const { submitModifierLabel } = await import('../../src/utils/keyboard');
      expect(submitModifierLabel).toBe('Ctrl');
    });

    it('Ctrl+Enter で isSubmitKey が true を返す', async () => {
      const { isSubmitKey } = await import('../../src/utils/keyboard');
      expect(isSubmitKey(createKeyEvent({ ctrlKey: true }))).toBe(true);
    });

    it('Meta+Enter で isSubmitKey が false を返す', async () => {
      const { isSubmitKey } = await import('../../src/utils/keyboard');
      expect(isSubmitKey(createKeyEvent({ metaKey: true }))).toBe(false);
    });

    it('Enter のみで isSubmitKey が false を返す', async () => {
      const { isSubmitKey } = await import('../../src/utils/keyboard');
      expect(isSubmitKey(createKeyEvent())).toBe(false);
    });

    it('Ctrl+Enter 以外のキーで isSubmitKey が false を返す', async () => {
      const { isSubmitKey } = await import('../../src/utils/keyboard');
      expect(isSubmitKey(createKeyEvent({ key: 'a', ctrlKey: true }))).toBe(false);
    });
  });
});
