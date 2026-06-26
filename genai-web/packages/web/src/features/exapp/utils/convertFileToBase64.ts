/**
 * ファイルをBase64エンコードされた文字列に変換する
 * @param file - 変換するファイル
 * @returns Base64エンコードされた文字列
 */
export const convertFileToBase64 = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (typeof ev.target?.result === 'string') {
        // 'data:<mime>;base64,xxxx...' の , 以降だけ取得
        const base64 = ev.target.result.split(',')[1] || '';
        resolve(base64);
      } else {
        reject(new Error('Failed to read file as base64 string.'));
      }
    };
    reader.onerror = () => reject(new Error('File reading failed.'));
    reader.readAsDataURL(file);
  });
};
