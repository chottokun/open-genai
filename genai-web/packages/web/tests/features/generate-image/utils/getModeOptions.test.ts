import { describe, it, expect } from 'vitest';
import { getModeOptions } from '../../../../src/features/generate-image/utils/getModeOptions';

describe('getModeOptions 批判的テスト', () => {
  it('未知または空のモデルIDに対してデフォルトの TEXT_IMAGE モードを返すこと', () => {
    const options = getModeOptions('unknown-model-xyz');
    expect(options).toEqual([
      {
        value: 'TEXT_IMAGE',
        label: 'TEXT_IMAGE',
      },
    ]);
  });

  it('空文字列のモデルIDに対してもクラッシュせずデフォルトを返すこと', () => {
    const options = getModeOptions('');
    expect(options.length).toBeGreaterThan(0);
    expect(options[0].value).toBe('TEXT_IMAGE');
  });
});
