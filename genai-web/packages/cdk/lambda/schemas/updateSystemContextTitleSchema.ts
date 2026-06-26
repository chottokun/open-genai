import { z } from 'zod';

export const updateSystemContextTitleSchema = z.object({
  title: z.string({ error: 'タイトルの形式が不正です。' }).trim().min(1, 'タイトルは必須です。'),
});

export type UpdateSystemContextTitleInput = z.infer<typeof updateSystemContextTitleSchema>;
