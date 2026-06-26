import { z } from 'zod';

export const teamUpdateSchema = z.object({
  name: z
    .string()
    .min(1, { message: 'チーム名を入力してください' })
    .max(100, { message: 'チーム名は100文字以内で入力してください' }),
});

export type TeamUpdateSchema = z.infer<typeof teamUpdateSchema>;
