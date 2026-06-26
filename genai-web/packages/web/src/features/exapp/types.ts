type GovAIFormUIType =
  | 'text'
  | 'number'
  | 'textarea'
  | 'file'
  | 'select'
  | 'radio'
  | 'checkbox'
  | 'hidden';

export type GovAIListItem = {
  title: string;
  value: string;
};

export type GovAIFormUI = {
  type: GovAIFormUIType; // UIタイプ
  title: string; // タイトルラベル
  desc?: string; // サポートテキスト
  required?: boolean; // 必須かどうか（未指定の場合は任意になる）
  default_value?: string; // デフォルト値
};

export type GovAIFormUIText = {
  min_length?: number; // 文字数の最小値
  max_length?: number; // 文字数の最大値
} & GovAIFormUI;

export type GovAIFormUINumber = {
  min?: number; // 数字の最小値
  max?: number; // 数字の最大値
} & GovAIFormUI;

export type GovAIFormUIFile = {
  multiple?: boolean; // 複数ファイルのアップロードを許可するかどうか
  accept?: string; // 受付可能なファイルのフォーマット（accept属性に設定される）（https://developer.mozilla.org/ja/docs/Web/HTML/Reference/Attributes/accept）
  max_size?: string; // ファイルの最大サイズ（KB, MB, GBで指定）（5KB, 5.8MB, 4.2GB等）
  max_file_count?: number; // アップロード可能なファイルの最大数（multipleがtrueの場合に使用される）
} & GovAIFormUI;

export type GovAIFormUITextarea = {
  min_length?: number; // 文字数の最小値
  max_length?: number; // 文字数の最大値
} & GovAIFormUI;

export type GovAIFormUISelect = {
  items?: GovAIListItem[]; // 選択肢のリスト
} & GovAIFormUI;

export type GovAIFormUICheckbox = {
  items?: GovAIListItem[]; // 選択肢のリスト
} & GovAIFormUI;

export type GovAIFormUIRadio = {
  items?: GovAIListItem[]; // 選択肢のリスト
} & GovAIFormUI;

export type GovAIFormUIHidden = {
  type: 'hidden';
  default_value: string;
};

export type GovAIFormUIItem =
  | GovAIFormUIText
  | GovAIFormUINumber
  | GovAIFormUIFile
  | GovAIFormUITextarea
  | GovAIFormUISelect
  | GovAIFormUICheckbox
  | GovAIFormUIRadio
  | GovAIFormUIHidden;

export type GovAIFormUIJson = {
  [key in string]: GovAIFormUIItem;
};

export type GovAIFormDefaultValue = {
  [key in string]: string;
};

export type ConversationHistory = {
  input: string;
  output: string;
  createdDate: string;
};

export type FileInputItem = {
  files: { filename: string }[];
};
