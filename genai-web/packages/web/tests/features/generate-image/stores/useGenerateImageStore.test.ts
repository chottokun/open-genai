import { describe, it, expect, beforeEach } from 'vitest';
import { useGenerateImageStore } from '../../../../src/features/generate-image/stores/useGenerateImageStore';

describe('useGenerateImageStore UI・状態批判的テスト', () => {
  beforeEach(() => {
    useGenerateImageStore.getState().clear();
  });

  it('初期状態が正しくクリアおよび初期化されること', () => {
    const state = useGenerateImageStore.getState();
    expect(state.prompt).toBe('');
    expect(state.negativePrompt).toBe('');
    expect(state.generationMode).toBe('TEXT_IMAGE');
    expect(state.quality).toBe('standard');
    expect(state.style).toBe('natural');
    expect(state.extraBody).toBe('');
    expect(state.image.length).toBeGreaterThan(0);
  });

  it('モデル変更時に解像度プリセットおよびモード整合性が評価されること', () => {
    const store = useGenerateImageStore.getState();
    store.setImageGenModelId('local-sd');
    
    const updatedState = useGenerateImageStore.getState();
    expect(updatedState.imageGenModelId).toBe('local-sd');
    expect(updatedState.resolutionPresets.length).toBeGreaterThan(0);
    expect(updatedState.resolution.value).toBe(updatedState.resolutionPresets[0].value);
  });

  it('BACKGROUND_REMOVAL モード切り替え時に imageSample が退避・復元されること', () => {
    const store = useGenerateImageStore.getState();
    store.setImageSample(4);
    expect(useGenerateImageStore.getState().imageSample).toBe(4);

    // BACKGROUND_REMOVAL に変更 -> imageSample は 1 に固定
    store.setGenerationMode('BACKGROUND_REMOVAL');
    expect(useGenerateImageStore.getState().generationMode).toBe('BACKGROUND_REMOVAL');
    expect(useGenerateImageStore.getState().imageSample).toBe(1);

    // 他モード（TEXT_IMAGE）に戻す -> 退避された 4 に復元
    store.setGenerationMode('TEXT_IMAGE');
    expect(useGenerateImageStore.getState().generationMode).toBe('TEXT_IMAGE');
    expect(useGenerateImageStore.getState().imageSample).toBe(4);
  });

  it('画像設定およびエラー状態のイミュータブル更新が正常であること', () => {
    const store = useGenerateImageStore.getState();
    store.setImageError(0, '生成タイムアウトエラー');

    let state = useGenerateImageStore.getState();
    expect(state.image[0].error).toBe(true);
    expect(state.image[0].errorMessage).toBe('生成タイムアウトエラー');

    store.setImage(0, 'data:image/png;base64,sample');
    state = useGenerateImageStore.getState();
    expect(state.image[0].error).toBe(false);
    expect(state.image[0].base64).toBe('data:image/png;base64,sample');

    store.clearImage();
    state = useGenerateImageStore.getState();
    expect(state.image[0].base64).toBe('');
    expect(state.image[0].error).toBe(false);
  });
});
