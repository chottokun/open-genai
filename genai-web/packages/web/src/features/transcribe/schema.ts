import { z } from 'zod';

const ACCEPT_AUDIO_TYPES = [
  'audio/mpeg', // mp3
  'audio/wav',
  'audio/x-flac', // flac
  'audio/ogg',
  'audio/AMR', // amr
  'audio/amr', // amr
  'video/mp4',
  'audio/mp4',
  'audio/aac',
  'audio/m4a',
  'audio/x-m4a',
  'video/webm',
];

export const transcribeFormSchema = z.object({
  file: z
    .instanceof(File, { message: '音声ファイルは必須です' })
    .refine((file) => ACCEPT_AUDIO_TYPES.includes(file.type), {
      message: '選択したファイルにエラーがあります。該当ファイルをチェックしてください。',
    }),
  speakerNum: z
    .number()
    .min(2, { message: '話者の最大数は2以上に設定してください' })
    .max(10, { message: '話者の最大数は10以下に設定してください' })
    .optional(),
  speaker: z.string().optional(),
});

export type TranscribeFormSchema = z.infer<typeof transcribeFormSchema>;
