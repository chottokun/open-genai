export type GenerateImagePageQueryParams = {
  modelId?: string;
  content?: string;
  imageModelId?: string;
};

export type Canvas = {
  imageBase64: string;
  foregroundBase64: string;
  backgroundColor: string;
};
