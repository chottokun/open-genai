import { convertSizeToBytes } from './convertSizeToBytes';

type FileData = {
  key: string;
  files: { filename: string; content: string }[];
};

/**
 * ペイロードのサイズが最大サイズ以下かどうかを検証する
 * @param maxPayloadSize - 最大ペイロードサイズ（例: "5MB"）
 * @param data - フォームデータ
 * @param files - ファイルデータ
 * @returns サイズが有効な場合はtrue
 */
export const validatePayloadSize = (
  maxPayloadSize: string,
  data: Record<string, unknown>,
  files: FileData[],
): boolean => {
  const maxPayloadBytes = convertSizeToBytes(maxPayloadSize);
  const dataTotalSize = Object.keys(data).reduce((total, key) => {
    return total + new Blob([String(data[key])]).size;
  }, 0);
  const filesTotalSize = files.reduce((total, file) => {
    return (
      total +
      file.files.reduce((fileTotal, f) => {
        return fileTotal + new Blob([f.content]).size;
      }, 0)
    );
  }, 0);

  return dataTotalSize + filesTotalSize <= maxPayloadBytes;
};
