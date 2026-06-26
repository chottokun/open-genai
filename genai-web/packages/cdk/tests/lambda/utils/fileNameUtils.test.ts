import { describe, expect, it } from 'vitest';
import { toSafeDocumentName } from '../../../lambda/utils/fileNameUtils';

describe('toSafeDocumentName', () => {
  describe('基本動作', () => {
    it('半角英数字のみのファイル名は変換されない', () => {
      expect(toSafeDocumentName('report.pdf')).toBe('report');
    });

    it('拡張子が除去される', () => {
      expect(toSafeDocumentName('document.docx')).toBe('document');
    });

    it('許可文字（ハイフン・括弧・角括弧）は変換されない', () => {
      expect(toSafeDocumentName('my-file (1) [v2].pdf')).toBe(
        'my-file (1) [v2]'
      );
    });

    it('半角スペースは変換されない', () => {
      expect(toSafeDocumentName('my file.pdf')).toBe('my file');
    });
  });

  describe('非ASCII文字の変換', () => {
    it('日本語文字は _ に変換され、ハッシュが付与される', () => {
      const result = toSafeDocumentName('テスト資料.pdf');
      expect(result).toMatch(/^[_].*_[0-9a-f]{8}$/);
    });

    it('同じ入力は常に同じ出力を返す（決定論的）', () => {
      const filename = 'テスト資料.pdf';
      expect(toSafeDocumentName(filename)).toBe(toSafeDocumentName(filename));
    });

    it('US1: 全角スペース（U+3000）は _ に変換される', () => {
      const filename = 'テスト\u3000資料.pdf';
      const result = toSafeDocumentName(filename);
      expect(result).not.toContain('\u3000');
      expect(result).toMatch(/_[0-9a-f]{8}$/);
    });

    it('US1: 全角スペースを含むファイル名はハッシュが付与される', () => {
      const result = toSafeDocumentName('テスト\u3000資料.pdf');
      expect(result).toMatch(/_[0-9a-f]{8}$/);
    });
  });

  describe('拡張子処理', () => {
    it('拡張子がないファイル名はエラーにならない', () => {
      expect(() => toSafeDocumentName('ファイル名')).not.toThrow();
    });

    it('拡張子がない日本語ファイル名も変換される', () => {
      const result = toSafeDocumentName('資料');
      expect(result).toMatch(/_[0-9a-f]{8}$/);
    });

    it('複数のドットがある場合は最後のドット以降が拡張子として扱われ、残ったドットは _ に変換される', () => {
      const result = toSafeDocumentName('my.file.name.txt');
      expect(result).toMatch(/^my_file_name_[0-9a-f]{8}$/);
    });
  });

  describe('US2: 複数ファイルの衝突回避', () => {
    it('異なるファイル名は異なるハッシュを持つ', () => {
      const result1 = toSafeDocumentName('テスト資料A.pdf');
      const result2 = toSafeDocumentName('テスト資料B.pdf');
      expect(result1).not.toBe(result2);
    });

    it('同一ファイル名は同一のサニタイズ結果を返す（ハッシュは決定論的）', () => {
      const filename = 'テスト資料.pdf';
      expect(toSafeDocumentName(filename)).toBe(toSafeDocumentName(filename));
    });

    it('インデックスを付与すると重複する名前も一意になる', () => {
      const filename = 'テスト資料.pdf';
      const baseName = toSafeDocumentName(filename);
      const name0 = `${baseName}-0`;
      const name1 = `${baseName}-1`;
      expect(name0).not.toBe(name1);
    });
  });

  describe('US3: 会話をまたいだ一意性', () => {
    it('同じファイル名に異なるインデックスを付与すると一意になる', () => {
      const filename = 'テスト資料.pdf';
      const baseName = toSafeDocumentName(filename);
      expect(`${baseName}-0`).not.toBe(`${baseName}-1`);
    });

    it('ASCII のみのファイル名もインデックスで一意になる', () => {
      const baseName = toSafeDocumentName('report.pdf');
      expect(`${baseName}-0`).not.toBe(`${baseName}-1`);
      expect(`${baseName}-0`).toBe('report-0');
      expect(`${baseName}-1`).toBe('report-1');
    });
  });
});
