import { z } from 'zod';

export const createTeamSchema = z.object({
  teamName: z.string({ error: 'チーム名の形式が不正です。' }).trim().min(1, 'チーム名は必須です。'),
  teamAdminEmail: z
    .string({ error: 'チーム管理者のメールアドレスの形式が不正です。' })
    .trim()
    .min(1, 'チーム管理者のメールアドレスは必須です。')
    .email('有効なメールアドレスを入力してください。'),
});

export type CreateTeamInput = z.infer<typeof createTeamSchema>;
