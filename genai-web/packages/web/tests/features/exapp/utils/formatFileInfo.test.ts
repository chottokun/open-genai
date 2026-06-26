import { describe, expect, it } from 'vitest';
import { formatFileInfo } from '../../../../src/features/exapp/utils/formatFileInfo';

describe('formatFileInfo', () => {
  describe('旧形式（filename直接指定）', () => {
    it('単一ファイルのファイル名を返す', () => {
      const files = [{ filename: 'document.pdf' }];

      const result = formatFileInfo(files);

      expect(result).toBe('document.pdf');
    });

    it('複数ファイルのファイル名をカンマ区切りで返す', () => {
      const files = [
        { filename: 'file1.txt' },
        { filename: 'file2.txt' },
        { filename: 'file3.txt' },
      ];

      const result = formatFileInfo(files);

      expect(result).toBe('file1.txt, file2.txt, file3.txt');
    });
  });

  describe('新形式（filesプロパティ）', () => {
    it('単一ファイルグループの単一ファイル名を返す', () => {
      const files = [{ files: [{ filename: 'image.png' }] }];

      const result = formatFileInfo(files);

      expect(result).toBe('image.png');
    });

    it('単一ファイルグループの複数ファイル名をカンマ区切りで返す', () => {
      const files = [
        {
          files: [{ filename: 'img1.jpg' }, { filename: 'img2.jpg' }, { filename: 'img3.jpg' }],
        },
      ];

      const result = formatFileInfo(files);

      expect(result).toBe('img1.jpg, img2.jpg, img3.jpg');
    });

    it('複数ファイルグループのファイル名をカンマ区切りで返す', () => {
      const files = [
        { files: [{ filename: 'doc1.pdf' }, { filename: 'doc2.pdf' }] },
        { files: [{ filename: 'image.png' }] },
      ];

      const result = formatFileInfo(files);

      expect(result).toBe('doc1.pdf, doc2.pdf, image.png');
    });
  });

  describe('混合形式', () => {
    it('旧形式と新形式が混在している場合も正しく処理する', () => {
      const files = [
        { filename: 'old-format.txt' },
        { files: [{ filename: 'new-format1.pdf' }, { filename: 'new-format2.pdf' }] },
        { filename: 'another-old.doc' },
      ];

      const result = formatFileInfo(files);

      expect(result).toBe('old-format.txt, new-format1.pdf, new-format2.pdf, another-old.doc');
    });
  });

  describe('エッジケース', () => {
    it('空の配列で空文字列を返す', () => {
      const files: { filename: string }[] = [];

      const result = formatFileInfo(files);

      expect(result).toBe('');
    });

    it('新形式で空のfilesを持つ場合は空文字列部分を返す', () => {
      const files = [{ files: [] as { filename: string }[] }];

      const result = formatFileInfo(files);

      expect(result).toBe('');
    });

    it('日本語ファイル名を正しく処理する', () => {
      const files = [
        { filename: '資料.pdf' },
        { files: [{ filename: '画像1.png' }, { filename: '画像2.png' }] },
      ];

      const result = formatFileInfo(files);

      expect(result).toBe('資料.pdf, 画像1.png, 画像2.png');
    });

    it('特殊文字を含むファイル名を正しく処理する', () => {
      const files = [
        { filename: 'file (1).txt' },
        { filename: 'file-with-dash.pdf' },
        { filename: 'file_with_underscore.doc' },
      ];

      const result = formatFileInfo(files);

      expect(result).toBe('file (1).txt, file-with-dash.pdf, file_with_underscore.doc');
    });
  });
});
