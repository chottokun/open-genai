type FileItem =
  | {
      filename: string;
    }
  | {
      files: { filename: string }[];
    };

/**
 * ファイル情報を文字列形式にフォーマットする
 * @param files - ファイル情報の配列（旧形式または新形式）
 * @returns カンマ区切りのファイル名文字列
 */
export const formatFileInfo = (files: FileItem[]): string => {
  return files
    .map((item) => {
      if ('filename' in item) {
        // 旧インプット
        return item.filename;
      }
      // 新インプット
      return item.files.map((file) => file.filename).join(', ');
    })
    .join(', ');
};
