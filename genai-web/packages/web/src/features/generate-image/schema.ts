import { z } from 'zod';

export const generateImageChatFormSchema = z.object({
  content: z
    .string()
    .min(1, { message: 'メッセージを入力してください' })
    .refine(
      (value) => {
        return value.trim().length > 0;
      },
      {
        message: 'メッセージは空白のみでは送信できません。',
      },
    ),
});

export type GenerateImageChatFormSchema = z.infer<typeof generateImageChatFormSchema>;
