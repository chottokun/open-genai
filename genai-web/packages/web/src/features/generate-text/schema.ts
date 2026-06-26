import { z } from 'zod';

export const generateTextFormSchema = z.object({
  information: z.string().min(1, { message: '文章の元になる情報を入力してください' }),
  format: z
    .string()
    .max(1000, { message: '文章の形式は1000文字以内で入力してください' })
    .optional(),
});

export type GenerateTextFormSchema = z.infer<typeof generateTextFormSchema>;
