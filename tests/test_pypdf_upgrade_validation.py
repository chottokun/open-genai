"""pypdf 6.16.2 アップグレード後の実働テスト。

CVE-2026-84309 / CVE-2026-84310 / CVE-2026-84311 対応のバージョン検証、および
docextract 経由の PDF 処理の回帰・エッジケーステスト。
"""
from __future__ import annotations

import base64
import io
import os
import sys

import pytest

# テスト対象モジュールのパス解決
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "shared"))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "tests"))

from pypdf import PdfWriter
import pypdf


# ---------------------------------------------------------------------------
# 1. バージョン検証
# ---------------------------------------------------------------------------
class TestPypdfVersion:
    """pypdf がセキュリティパッチ済みバージョンであることを検証する。"""

    def test_pypdf_version_is_6_15_0_or_later(self) -> None:
        """CVE-2026-84309/CVE-2026-84310/CVE-2026-84311 修正版 (>=6.16.2) であること。"""
        parts = pypdf.__version__.split(".")
        major, minor, patch = int(parts[0]), int(parts[1]), int(parts[2])
        assert (major, minor, patch) >= (6, 16, 2), (
            f"pypdf {pypdf.__version__} は脆弱性修正版 6.16.2 以上が必要です"
        )

    def test_pypdf_imports_cleanly(self) -> None:
        """pypdf の主要クラスが正常にインポートできること。"""
        from pypdf import PdfReader, PdfWriter
        assert PdfReader is not None
        assert PdfWriter is not None


# ---------------------------------------------------------------------------
# 2. PDF テキスト抽出の実働テスト
# ---------------------------------------------------------------------------
def _create_pdf_with_text(text: str, num_pages: int = 1) -> bytes:
    """テキスト付きPDFバイナリを生成するヘルパー。"""
    writer = PdfWriter()
    for i in range(num_pages):
        writer.add_blank_page(width=612, height=792)
        page = writer.pages[i]
        # pypdf の低レベル操作でコンテンツストリームにテキストを注入
        from pypdf.generic import (
            DecodedStreamObject,
            DictionaryObject,
            NameObject,
        )
        stream = DecodedStreamObject()
        page_text = f"{text} (page {i+1})" if num_pages > 1 else text
        stream.set_data(
            f"BT /F1 12 Tf 100 700 Td ({page_text}) Tj ET".encode("latin-1")
        )
        page[NameObject("/Contents")] = stream
        # フォントリソース
        font_dict = DictionaryObject()
        font_dict[NameObject("/Type")] = NameObject("/Font")
        font_dict[NameObject("/Subtype")] = NameObject("/Type1")
        font_dict[NameObject("/BaseFont")] = NameObject("/Helvetica")
        resources = DictionaryObject()
        fonts = DictionaryObject()
        fonts[NameObject("/F1")] = font_dict
        resources[NameObject("/Font")] = fonts
        page[NameObject("/Resources")] = resources

    buf = io.BytesIO()
    writer.write(buf)
    return buf.getvalue()


def _create_blank_pdf(num_pages: int = 1) -> bytes:
    """テキストなし空白PDFバイナリを生成するヘルパー。"""
    writer = PdfWriter()
    for _ in range(num_pages):
        writer.add_blank_page(width=72, height=72)
    buf = io.BytesIO()
    writer.write(buf)
    return buf.getvalue()


class TestPdfTextExtraction:
    """pypdf 6.15.0 による PDF テキスト抽出の実働テスト。"""

    def test_read_text_from_pdf_directly(self) -> None:
        """pypdf.PdfReader でテキスト付きPDFから文字列を抽出できること。"""
        from pypdf import PdfReader
        pdf_bytes = _create_pdf_with_text("Hello pypdf 6.15.0")
        reader = PdfReader(io.BytesIO(pdf_bytes))
        assert len(reader.pages) == 1
        text = reader.pages[0].extract_text()
        assert text is not None
        assert "Hello" in text

    def test_multi_page_pdf_extraction(self) -> None:
        """複数ページPDFから各ページのテキストを正しく抽出できること。"""
        from pypdf import PdfReader
        pdf_bytes = _create_pdf_with_text("Page content", num_pages=5)
        reader = PdfReader(io.BytesIO(pdf_bytes))
        assert len(reader.pages) == 5
        for i, page in enumerate(reader.pages):
            text = page.extract_text() or ""
            assert "Page content" in text or f"page {i+1}" in text

    def test_blank_pdf_returns_empty_text(self) -> None:
        """空白PDFのテキスト抽出が例外を投げずに空文字列を返すこと。"""
        from pypdf import PdfReader
        pdf_bytes = _create_blank_pdf()
        reader = PdfReader(io.BytesIO(pdf_bytes))
        text = reader.pages[0].extract_text()
        # 空白ページは空文字列または None
        assert text is None or text.strip() == ""


class TestDocextractIntegration:
    """docextract モジュール経由の PDF 処理統合テスト。"""

    def test_extract_doc_text_with_text_pdf(self) -> None:
        """テキスト付きPDFで extract_doc_text がテキストを返すこと。"""
        import docextract
        pdf_bytes = _create_pdf_with_text("Integration test text")
        payload = base64.b64encode(pdf_bytes).decode("ascii")
        result = docextract.extract_doc_text("test.pdf", "application/pdf", payload)
        assert result is not None
        assert "Integration" in result or "test" in result

    def test_extract_doc_pages_with_multi_page_pdf(self) -> None:
        """複数ページPDFで extract_doc_pages がページ構造を保持すること。"""
        import docextract
        pdf_bytes = _create_pdf_with_text("Structured page", num_pages=3)
        payload = base64.b64encode(pdf_bytes).decode("ascii")
        pages = docextract.extract_doc_pages("multi.pdf", "application/pdf", payload)
        assert len(pages) == 3
        assert all(p["page"] == i + 1 for i, p in enumerate(pages))

    def test_extract_doc_pages_blank_pdf_raises_error(self) -> None:
        """空白PDFでDocExtractErrorが発生すること。"""
        import docextract
        pdf_bytes = _create_blank_pdf()
        payload = base64.b64encode(pdf_bytes).decode("ascii")
        with pytest.raises(docextract.DocExtractError):
            docextract.extract_doc_pages("blank.pdf", "application/pdf", payload)

    def test_extract_doc_text_full_no_truncation(self) -> None:
        """extract_doc_text_full がMAX_DOC_CHARSの制限を受けないこと。"""
        import docextract
        pdf_bytes = _create_pdf_with_text("Full text extraction test")
        payload = base64.b64encode(pdf_bytes).decode("ascii")
        result = docextract.extract_doc_text_full("full.pdf", "application/pdf", payload)
        assert result is not None
        assert "Full" in result or "text" in result


class TestPdfRobustness:
    """pypdf 6.15.0 の堅牢性テスト — 壊れた入力への耐性。"""

    def test_corrupted_pdf_bytes_handled_gracefully(self) -> None:
        """壊れたPDFバイナリをdocextractに渡しても安全にエラーハンドリングされること。"""
        import docextract
        # 不正なバイナリ
        bad_data = b"%PDF-1.4 corrupted data without proper structure"
        payload = base64.b64encode(bad_data).decode("ascii")
        result = docextract.extract_doc_text("bad.pdf", "application/pdf", payload)
        # エラーメッセージが返るか None が返ることを確認（クラッシュしない）
        assert result is None or "失敗" in result or isinstance(result, str)

    def test_empty_pdf_bytes(self) -> None:
        """空のバイナリでもクラッシュしないこと。"""
        import docextract
        payload = base64.b64encode(b"").decode("ascii")
        result = docextract.extract_doc_text("empty.pdf", "application/pdf", payload)
        assert result is None or "失敗" in result or isinstance(result, str)

    def test_non_pdf_with_pdf_extension(self) -> None:
        """PDF拡張子だが実際はテキストファイルの場合のハンドリング。"""
        import docextract
        text_data = "This is not a PDF file".encode("utf-8")
        payload = base64.b64encode(text_data).decode("ascii")
        result = docextract.extract_doc_text("fake.pdf", "application/pdf", payload)
        assert result is None or "失敗" in result or isinstance(result, str)

    def test_large_page_count_rejection(self, monkeypatch: pytest.MonkeyPatch) -> None:
        """MAX_DOC_PAGES超過時にDocExtractErrorが発生すること。"""
        import docextract
        monkeypatch.setattr(docextract, "MAX_DOC_PAGES", 2)
        pdf_bytes = _create_pdf_with_text("Overflow", num_pages=5)
        payload = base64.b64encode(pdf_bytes).decode("ascii")
        with pytest.raises(docextract.DocExtractError, match="ページ数が上限"):
            docextract.extract_doc_pages("big.pdf", "application/pdf", payload)

    def test_pypdf_reader_invalid_stream(self) -> None:
        """PdfReader に不正ストリームを渡しても適切に例外が発生すること。"""
        from pypdf import PdfReader
        with pytest.raises(Exception):
            PdfReader(io.BytesIO(b"not a pdf"))
