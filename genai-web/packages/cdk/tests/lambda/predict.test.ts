import { APIGatewayProxyEvent } from 'aws-lambda';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { HttpError } from '../../lambda/utils/httpError';

const { mockInvoke, mockResolveAllowedTextModel } = vi.hoisted(() => ({
  mockInvoke: vi.fn(),
  mockResolveAllowedTextModel: vi.fn(),
}));

vi.mock('../../lambda/utils/api', () => ({
  default: {
    bedrock: { invoke: mockInvoke },
    sagemaker: { invoke: mockInvoke },
  },
}));

vi.mock('../../lambda/utils/allowedModels', () => ({
  resolveAllowedTextModel: mockResolveAllowedTextModel,
}));

import { handler } from '../../lambda/predict';

function createEvent(body: Record<string, unknown>): APIGatewayProxyEvent {
  return {
    body: JSON.stringify(body),
    pathParameters: {},
    requestContext: {
      authorizer: { claims: { sub: 'test-user' } },
    },
  } as unknown as APIGatewayProxyEvent;
}

describe('predict Lambda handler', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockResolveAllowedTextModel.mockImplementation((model) => model ?? { type: 'bedrock', modelId: 'test-model' });
  });

  test('デフォルトモデルで推論して200を返す', async () => {
    mockInvoke.mockResolvedValue('AI response');

    const event = createEvent({
      messages: [{ role: 'user', content: 'hello' }],
      id: 'req-1',
    });
    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body)).toBe('AI response');
    expect(mockInvoke).toHaveBeenCalledWith(
      { type: 'bedrock', modelId: 'test-model' },
      [{ role: 'user', content: 'hello' }],
      'req-1',
    );
  });

  test('リクエストでモデルを指定できる', async () => {
    mockInvoke.mockResolvedValue('response');
    mockResolveAllowedTextModel.mockReturnValue({ type: 'bedrock', modelId: 'custom-model' });

    const event = createEvent({
      messages: [{ role: 'user', content: 'hi' }],
      id: 'req-2',
      model: { type: 'bedrock', modelId: 'custom-model' },
    });
    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    expect(mockInvoke).toHaveBeenCalledWith(
      { type: 'bedrock', modelId: 'custom-model' },
      [{ role: 'user', content: 'hi' }],
      'req-2',
    );
  });

  test('allowlist外のモデル指定は400で拒否する', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockResolveAllowedTextModel.mockImplementation(() => {
      throw new HttpError(400, 'このモデルは使用できません。');
    });

    const event = createEvent({
      messages: [{ role: 'user', content: 'hi' }],
      id: 'req-4',
      model: { type: 'bedrock', modelId: 'custom-model' },
    });
    const result = await handler(event);

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body)).toEqual({
      error: 'このモデルは使用できません。',
    });
    expect(mockInvoke).not.toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });

  test('エラー時は500を返す', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockInvoke.mockRejectedValue(new Error('Bedrock error'));

    const event = createEvent({
      messages: [{ role: 'user', content: 'hi' }],
      id: 'req-3',
    });
    const result = await handler(event);

    expect(result.statusCode).toBe(500);
    expect(JSON.parse(result.body)).toEqual({
      error: 'サーバ側でエラーが発生しました。管理者へご連絡ください。',
    });

    consoleErrorSpy.mockRestore();
  });
});
