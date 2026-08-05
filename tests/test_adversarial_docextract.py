"""Adversarial and critical edge-case testing for docextract and textnorm."""

from __future__ import annotations

import base64
import pytest
from shared import textnorm
from conftest import load_service_module
import docextract


def test_adversarial_binary_payload_as_txt() -> None:
    # Completely random non-UTF8 binary data (like a compiled binary or image bytes)
    bad_bytes = bytes(range(256))  # all 256 byte values
    payload = base64.b64encode(bad_bytes).decode("ascii")

    # Verify parsing it as a .txt does not crash
    result = docextract.extract_doc_text_full("random.txt", "text/plain", payload)
    assert result is not None
    assert isinstance(result, str)
    # Binary should have been decoded with replacement characters, not crashed
    assert "\ufffd" in result or len(result) > 0


def test_adversarial_malformed_b64_returns_none(monkeypatch: pytest.MonkeyPatch) -> None:
    # Mock base64.b64decode to raise ValueError to test robustness against base64 decoding errors
    import base64 as b64_module
    def mock_b64decode(s, *args, **kwargs):
        raise ValueError("Strict base64 decode failure simulation")
    monkeypatch.setattr(b64_module, "b64decode", mock_b64decode)

    result = docextract.extract_doc_text_full("note.txt", "text/plain", "invalid-payload-bytes")
    # Verifies it gracefully handles base64 decoding errors by returning None
    assert result is None


def test_adversarial_null_and_empty_inputs() -> None:
    assert textnorm.normalize_source(None) == ""
    assert textnorm.normalize_source("") == ""
    assert textnorm.normalize_tag(None) == ""
    assert textnorm.normalize_tag("") == ""
    assert textnorm.normalize_tags(None) == []


def test_adversarial_huge_char_limit_clamp() -> None:
    # Create a huge text (1 million characters)
    huge_text = "あ" * 1000000
    payload = base64.b64encode(huge_text.encode("utf-8")).decode("ascii")

    # Test extract_doc_text_full with custom small clamp to verify clamping is instant and saves memory
    result = docextract.extract_doc_text_full("huge.txt", "text/plain", payload, max_chars=100)
    assert result is not None
    assert len(result) <= 200  # including warning message
    assert "huge.txt は 100 文字を超えたため" in result
