import type { z } from 'zod';
import { HttpError } from './httpError';
import { parseJsonBody } from './parseJsonBody';

export const parseRequestBody = <T>(schema: z.ZodType<T>, body: string): T => {
  const parsed = parseJsonBody(body);
  const result = schema.safeParse(parsed);
  if (!result.success) {
    throw new HttpError(400, result.error.issues[0].message);
  }
  return result.data;
};
