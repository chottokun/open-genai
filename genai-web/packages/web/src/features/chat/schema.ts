import { z } from 'zod';
import { TOP_CHAT_SYSTEM_PROMPT } from '@/features/landing/constants';
import { getPrompter } from '@/prompts';

export const chatFormSchema = z.object({
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

export type ChatFormSchema = z.infer<typeof chatFormSchema>;

const RESERVED_SYSTEM_CONTEXTS = [
  getPrompter('claude').systemContext('/chat'),
  TOP_CHAT_SYSTEM_PROMPT,
]
  .filter(Boolean)
  .map((s) => s.trim());

export const systemContextSaveSchema = z.object({
  title: z.string().min(1, 'タイトルを入力してください'),
  systemContext: z
    .string()
    .min(1, 'システムプロンプトを入力してください')
    .refine((value) => !RESERVED_SYSTEM_CONTEXTS.includes(value.trim()), {
      message: 'デフォルトのシステムプロンプトは保存できません',
    }),
});

export type SystemContextSaveSchema = z.infer<typeof systemContextSaveSchema>;
