import { HttpError } from './httpError';

export const parseJsonBody = (body: string | null | undefined): unknown => {
  if (body === null || body === undefined || body === '') {
    throw new HttpError(400, 'リクエストボディが空です。');
  }

  try {
    return JSON.parse(body);
  } catch {
    throw new HttpError(400, 'リクエストボディのJSON形式が不正です。');
  }
};
