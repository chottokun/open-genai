import { DIAGRAM_DATA } from './constants';
import { z } from 'zod';

const ids = Object.values(DIAGRAM_DATA).map((diagram) => diagram.id);

export const diagramFormSchema = z.object({
  type: z.enum(ids, { message: '有効な図の種類を選択してください' }),
  content: z.string().min(1, { message: 'ダイアグラム生成元の文章を入力してください' }),
});

export type DiagramFormSchema = z.infer<typeof diagramFormSchema>;
