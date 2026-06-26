import { APIGatewayProxyEvent } from 'aws-lambda';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { HttpError } from '../../lambda/utils/httpError';

const { mockGenerateImage, mockResolveAllowedImageModel } = vi.hoisted(() => ({
  mockGenerateImage: vi.fn(),
  mockResolveAllowedImageModel: vi.fn(),
}));

vi.mock('../../lambda/utils/api', () => ({
  default: {
    bedrock: { generateImage: mockGenerateImage },
  },
}));

vi.mock('../../lambda/utils/allowedModels', () => ({
  resolveAllowedImageModel: mockResolveAllowedImageModel,
}));

import { handler } from '../../lambda/generateImage';

function createEvent(body: Record<string, unknown>): APIGatewayProxyEvent {
  return {
    body: JSON.stringify(body),
    pathParameters: {},
    requestContext: {
      authorizer: { claims: { sub: 'test-user' } },
    },
  } as unknown as APIGatewayProxyEvent;
}

describe('generateImage Lambda handler', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockResolveAllowedImageModel.mockImplementation((model) => {
      return model ?? { type: 'bedrock', modelId: 'stability.stable-image-core-v1:0' };
    });
  });

  test('allowlist内の画像生成モデルで200を返す', async () => {
    mockGenerateImage.mockResolvedValue('base64-image');

    const result = await handler(
      createEvent({
        params: { prompt: 'cat' },
      }),
    );

    expect(result.statusCode).toBe(200);
    expect(result.body).toBe('base64-image');
    expect(result.isBase64Encoded).toBe(true);
    expect(mockGenerateImage).toHaveBeenCalledWith(
      { type: 'bedrock', modelId: 'stability.stable-image-core-v1:0' },
      { prompt: 'cat' },
    );
  });

  test('allowlist外の画像生成モデルは400で拒否する', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockResolveAllowedImageModel.mockImplementation(() => {
      throw new HttpError(400, 'このモデルは使用できません。');
    });

    const result = await handler(
      createEvent({
        params: { prompt: 'cat' },
        model: { type: 'bedrock', modelId: 'custom-image-model' },
      }),
    );

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body)).toEqual({
      error: 'このモデルは使用できません。',
    });
    expect(mockGenerateImage).not.toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });
});
