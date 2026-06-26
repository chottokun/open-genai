/**
 * サイズ文字列（例: "5MB", "1.5GB"）をバイト数に変換する
 * @param sizeStr - サイズ文字列
 * @returns バイト数
 * @throws サイズ形式が無効な場合、または未対応の単位の場合
 */
export const convertSizeToBytes = (sizeStr: string): number => {
  const units: { [key: string]: number } = {
    B: 1,
    KB: 1024,
    MB: 1024 ** 2,
    GB: 1024 ** 3,
    TB: 1024 ** 4,
  };
  const pattern = /^\s*([\d.]+)\s*([KMGT]?B)\s*$/i;
  const match = sizeStr.trim().match(pattern);
  if (!match) {
    throw new Error(`無効なサイズ形式: ${sizeStr}`);
  }
  const number = parseFloat(match[1]);
  const unit = match[2].toUpperCase();
  if (!(unit in units)) {
    throw new Error(`未対応の単位: ${unit}`);
  }
  return Math.round(number * units[unit]);
};
