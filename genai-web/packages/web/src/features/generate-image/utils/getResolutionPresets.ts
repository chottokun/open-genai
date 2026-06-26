import { MODEL_INFO, STABILITY_AI_2024_MODEL_PRESETS } from '../constants';

export const getResolutionPresets = (imageGenModelId: string) => {
  if (imageGenModelId in MODEL_INFO) {
    return MODEL_INFO[imageGenModelId].resolutionPresets;
  } else {
    return STABILITY_AI_2024_MODEL_PRESETS;
  }
};
