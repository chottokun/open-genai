import { GENERATION_MODES, MODEL_INFO } from '../constants';

export const getModeOptions = (imageGenModelId: string) => {
  if (imageGenModelId in MODEL_INFO) {
    return MODEL_INFO[imageGenModelId].supportedModes.map((mode) => ({
      value: mode,
      label: mode,
    }));
  } else {
    return [
      {
        value: GENERATION_MODES.TEXT_IMAGE,
        label: GENERATION_MODES.TEXT_IMAGE,
      },
    ];
  }
};
