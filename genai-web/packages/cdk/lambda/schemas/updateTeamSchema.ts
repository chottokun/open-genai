import { z } from 'zod';

export const updateTeamSchema = z.object({
  teamName: z.string({ error: 'チーム名の形式が不正です。' }).trim().min(1, 'チーム名は必須です。'),
});

export type UpdateTeamInput = z.infer<typeof updateTeamSchema>;
