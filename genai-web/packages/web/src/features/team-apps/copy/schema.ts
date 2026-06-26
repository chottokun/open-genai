import { z } from 'zod';
import { isJSON } from '@/utils/isJSON';

const statusSchema = z.preprocess(
  (val) => (val === '' ? undefined : val),
  z.enum(['draft', 'published'], {
    message: 'ステータスを選択してください',
  }),
);

export const teamAppCopySchema = z.object({
  name: z.string().min(1, { message: 'AIアプリ名を入力してください' }),
  config: z
    .string()
    .optional()
    .refine(
      (value) => {
        if (!value) {
          return true;
        }
        return isJSON(value);
      },
      {
        message: 'コンフィグはJSON形式にしてください',
      },
    ),
  uiFormat: z
    .string()
    .min(1, { message: 'APIリクエストのデータ形式（JSON）を入力してください' })
    .refine(
      (value) => {
        const v = value
          .replace(/("default_value":\s*")((?:[^"\\]|\\.)*)"/g, (_, p1, p2) => {
            const converted = p2.replace(/\r?\n/g, '\\n');
            return `${p1}${converted}"`;
          })
          .replace(/("desc":\s*")((?:[^"\\]|\\.)*)"/g, (_, p1, p2) => {
            const converted = p2.replace(/\r?\n/g, '\\n');
            return `${p1}${converted}"`;
          });
        return isJSON(v);
      },
      {
        message: 'APIリクエストのデータ形式はJSON形式にしてください',
      },
    ),
  description: z.string().min(1, { message: 'アプリの概要を入力してください' }),
  howToUse: z.string().min(1, { message: 'アプリの利用方法を入力してください' }),
  copyable: z.boolean(),
  status: statusSchema,
  systemPrompt: z.string().optional(),
  systemPromptKeyName: z.string().optional(),
});
