import { z } from 'zod';

export const updateTeamUserSchema = z.object({
  isAdmin: z.boolean({ error: 'isAdminの形式が不正です。' }),
});

export type UpdateTeamUserInput = z.infer<typeof updateTeamUserSchema>;
