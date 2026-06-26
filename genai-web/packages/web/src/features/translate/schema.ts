import { z } from 'zod';

export const translateFormSchema = z.object({
  sentence: z.string().min(1, { message: '翻訳したい文章を入力してください' }),
  additionalContext: z
    .string()
    .max(1000, { message: '追加コンテキストは1000文字以内で入力してください' })
    .optional(),
});

export type TranslateFormSchema = z.infer<typeof translateFormSchema>;
