import { z } from 'zod';

export const createSystemContextSchema = z.object({
  systemContextTitle: z
    .string({ error: 'システムコンテキストタイトルの形式が不正です。' })
    .trim()
    .min(1, 'システムコンテキストタイトルは必須です。'),
  systemContext: z
    .string({ error: 'システムコンテキストの形式が不正です。' })
    .trim()
    .min(1, 'システムコンテキストは必須です。'),
});

export type CreateSystemContextInput = z.infer<typeof createSystemContextSchema>;
