import { z } from 'zod';

// 空入力は required 属性によるネイティブバリデーションで処理
// 空白のみの入力は trim().min(1) でバリデーション
export const landingChatFormSchema = z.object({
  chatInput: z.string().trim().min(1, { message: 'メッセージは空白のみでは送信できません。' }),
});

export type LandingChatFormSchema = z.infer<typeof landingChatFormSchema>;
