import { z } from 'zod';

export const createTeamUserSchema = z.object({
  email: z
    .string({ error: 'メールアドレスの形式が不正です。' })
    .trim()
    .min(1, 'メールアドレスは必須です。')
    .email('有効なメールアドレスを入力してください。'),
  isAdmin: z.boolean({ error: 'isAdminの形式が不正です。' }),
});

export type CreateTeamUserInput = z.infer<typeof createTeamUserSchema>;
