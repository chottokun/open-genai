import { describe, expect, it } from 'vitest';
import { formatAcceptTypes } from '../../../../src/features/exapp/utils/formatAcceptTypes';

describe('formatAcceptTypes', () => {
  describe('画像形式', () => {
    it('単一の画像 MIME タイプをフォーマットする', () => {
      expect(formatAcceptTypes('image/png')).toBe('対応ファイル：PNG形式の画像');
    });

    it('複数の画像 MIME タイプをフォーマットする', () => {
      expect(formatAcceptTypes('image/png,image/jpeg')).toBe('対応ファイル：PNG/JPEG形式の画像');
    });

    it('画像ワイルドカードをフォーマットする', () => {
      expect(formatAcceptTypes('image/*')).toBe('対応ファイル：すべての画像');
    });

    it('画像拡張子をフォーマットする', () => {
      expect(formatAcceptTypes('.png,.jpg')).toBe('対応ファイル：PNG/JPEG形式の画像');
    });
  });

  describe('ドキュメント形式', () => {
    it('PDF MIME タイプをフォーマットする', () => {
      expect(formatAcceptTypes('application/pdf')).toBe('対応ファイル：PDF形式のドキュメント');
    });

    it('テキスト MIME タイプをフォーマットする', () => {
      expect(formatAcceptTypes('text/plain')).toBe('対応ファイル：テキスト形式のドキュメント');
    });

    it('複数のドキュメント形式をフォーマットする', () => {
      expect(formatAcceptTypes('application/pdf,text/plain,text/csv')).toBe(
        '対応ファイル：PDF/テキスト/CSV形式のドキュメント',
      );
    });

    it('Office ドキュメント形式をフォーマットする', () => {
      expect(
        formatAcceptTypes(
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ),
      ).toBe('対応ファイル：Word形式のドキュメント');
    });

    it('ドキュメント拡張子をフォーマットする', () => {
      expect(formatAcceptTypes('.pdf,.docx,.xlsx')).toBe(
        '対応ファイル：PDF/Word/Excel形式のドキュメント',
      );
    });
  });

  describe('動画形式', () => {
    it('動画 MIME タイプをフォーマットする', () => {
      expect(formatAcceptTypes('video/mp4')).toBe('対応ファイル：MP4形式の動画');
    });

    it('複数の動画形式をフォーマットする', () => {
      expect(formatAcceptTypes('video/mp4,video/webm,video/quicktime')).toBe(
        '対応ファイル：MP4/WebM/MOV形式の動画',
      );
    });

    it('動画ワイルドカードをフォーマットする', () => {
      expect(formatAcceptTypes('video/*')).toBe('対応ファイル：すべての動画');
    });
  });

  describe('音声形式', () => {
    it('音声 MIME タイプをフォーマットする', () => {
      expect(formatAcceptTypes('audio/mpeg')).toBe('対応ファイル：MP3形式の音声');
    });

    it('複数の音声形式をフォーマットする', () => {
      expect(formatAcceptTypes('audio/mpeg,audio/wav,audio/flac')).toBe(
        '対応ファイル：MP3/WAV/FLAC形式の音声',
      );
    });

    it('音声ワイルドカードをフォーマットする', () => {
      expect(formatAcceptTypes('audio/*')).toBe('対応ファイル：すべての音声');
    });
  });

  describe('複数カテゴリの組み合わせ', () => {
    it('画像とドキュメントの組み合わせをフォーマットする', () => {
      expect(formatAcceptTypes('image/png,image/jpeg,application/pdf')).toBe(
        '対応ファイル：PNG/JPEG形式の画像、PDF形式のドキュメント',
      );
    });

    it('画像、ドキュメント、テキストの組み合わせをフォーマットする', () => {
      expect(formatAcceptTypes('image/png,image/jpeg,application/pdf,text/plain')).toBe(
        '対応ファイル：PNG/JPEG形式の画像、PDF/テキスト形式のドキュメント',
      );
    });

    it('すべてのカテゴリを含む組み合わせをフォーマットする', () => {
      expect(formatAcceptTypes('image/png,application/pdf,video/mp4,audio/mpeg')).toBe(
        '対応ファイル：PNG形式の画像、PDF形式のドキュメント、MP4形式の動画、MP3形式の音声',
      );
    });

    it('カテゴリ順序が正しいことを確認する（画像→ドキュメント→動画→音声）', () => {
      const result = formatAcceptTypes('audio/mpeg,video/mp4,application/pdf,image/png');
      expect(result).toBe(
        '対応ファイル：PNG形式の画像、PDF形式のドキュメント、MP4形式の動画、MP3形式の音声',
      );
    });
  });

  describe('ワイルドカード', () => {
    it('text/* ワイルドカードをドキュメントとしてフォーマットする', () => {
      expect(formatAcceptTypes('text/*')).toBe('対応ファイル：すべてのドキュメント');
    });

    it('application/* ワイルドカードをドキュメントとしてフォーマットする', () => {
      expect(formatAcceptTypes('application/*')).toBe('対応ファイル：すべてのドキュメント');
    });

    it('未知のワイルドカードをファイルとしてフォーマットする', () => {
      expect(formatAcceptTypes('unknown/*')).toBe('対応ファイル：すべてのファイル');
    });

    it('ワイルドカードがある場合は個別形式を表示しない', () => {
      expect(formatAcceptTypes('image/*,image/png')).toBe('対応ファイル：すべての画像');
    });
  });

  describe('未知の形式', () => {
    it('未知の MIME タイプを other カテゴリに分類する', () => {
      expect(formatAcceptTypes('application/x-custom')).toBe(
        '対応ファイル：application/x-custom形式のファイル',
      );
    });

    it('未知の拡張子を大文字に変換して表示する', () => {
      expect(formatAcceptTypes('.xyz')).toBe('対応ファイル：XYZ形式のファイル');
    });

    it('未知の形式と既知の形式を組み合わせる', () => {
      expect(formatAcceptTypes('image/png,.xyz')).toBe(
        '対応ファイル：PNG形式の画像、XYZ形式のファイル',
      );
    });
  });

  describe('エッジケース', () => {
    it('空文字列の場合は空文字列を返す', () => {
      expect(formatAcceptTypes('')).toBe('');
    });

    it('スペースを含む入力を正しく処理する', () => {
      expect(formatAcceptTypes('image/png, image/jpeg, application/pdf')).toBe(
        '対応ファイル：PNG/JPEG形式の画像、PDF形式のドキュメント',
      );
    });

    it('大文字小文字の拡張子を正しく処理する', () => {
      expect(formatAcceptTypes('.PNG,.JPG')).toBe('対応ファイル：PNG/JPEG形式の画像');
    });

    it('重複する形式を一度だけ表示する', () => {
      expect(formatAcceptTypes('image/png,image/png,.png')).toBe('対応ファイル：PNG形式の画像');
    });

    it('.jpg と .jpeg を両方 JPEG として表示する', () => {
      expect(formatAcceptTypes('.jpg,.jpeg')).toBe('対応ファイル：JPEG形式の画像');
    });
  });
});
