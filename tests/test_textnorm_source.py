"""source（ファイル名）の Unicode NFC 正規化。"""

from __future__ import annotations

import unicodedata
from shared import textnorm
from conftest import load_service_module


def test_normalize_source_nfc_for_mac_filename() -> None:
    nfc = "20260803_三重県市町村総合事務組合_トレンド研修資料.pdf"
    nfd = unicodedata.normalize("NFD", nfc)
    assert nfc != nfd
    assert textnorm.normalize_source(nfd) == nfc
    assert textnorm.normalize_source(nfc) == nfc


def test_source_match_forms_includes_both() -> None:
    nfc = "トレンド.pdf"
    nfd = unicodedata.normalize("NFD", nfc)
    forms = textnorm.source_match_forms(nfc)
    assert nfc in forms
    assert nfd in forms


def test_get_doc_by_source_accepts_nfc_when_stored_nfd(
    tmp_path, monkeypatch
) -> None:
    docstore = load_service_module("rag-app/app/docstore.py")
    monkeypatch.setattr(docstore, "DB_PATH", str(tmp_path / "rag_meta.db"))
    docstore.init_db()

    nfc = "トレンド研修.pdf"
    nfd = unicodedata.normalize("NFD", nfc)
    # 移行前データ相当: DB に NFD を直接入れる
    with docstore._connect() as conn:  # noqa: SLF001
        conn.execute(
            """
            INSERT INTO docs (
              doc_id, scope, source, tags, page_count, char_count,
              truncated, content_hash, index_kind, created_at, updated_at
            ) VALUES (?, ?, ?, '[]', 1, 1, 0, '', 'tree', '1', '1')
            """,
            ("doc-1", "scope-1", nfd),
        )

    found = docstore.get_doc_by_source("scope-1", nfc)
    assert found is not None
    assert found["doc_id"] == "doc-1"
    assert found["source"] == nfc


def test_normalize_source_edge_cases() -> None:
    """空文字列、絵文字、混在テキストなどの批判的エッジケースを検証する。"""
    # 空文字
    assert textnorm.normalize_source("") == ""

    # 絵文字・サロゲートペア
    emoji_str = "テスト👨‍👩‍👧‍👦.pdf"
    assert textnorm.normalize_source(emoji_str) == unicodedata.normalize("NFC", emoji_str)

    # NFD 形式の濁点・半濁点混在
    nfd_mixed = "か" + "\u3099" + "き" + "\u3099" + "く" + "\u3099"  # がぎぐ NFD
    assert textnorm.normalize_source(nfd_mixed) == "がぎぐ"


def test_source_match_forms_uniqueness() -> None:
    """ASCIIのみのファイル名などで NFC と NFD が同一の場合に重複が除去されることを検証する。"""
    ascii_name = "test_document_123.pdf"
    forms = textnorm.source_match_forms(ascii_name)
    assert len(forms) == 1
    assert forms[0] == ascii_name

