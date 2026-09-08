"""Tests for reasoning output suppression in LLM module."""

import importlib.util
from typing import Any


def load_service_module(filepath: str) -> Any:
    spec = importlib.util.spec_from_file_location("module", filepath)
    if spec is None or spec.loader is None:
        raise ImportError(f"Could not load spec for {filepath}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_assistant_visible_text_skips_reasoning() -> None:
    llm = load_service_module("backend/app/llm.py")
    assert (
        llm._assistant_visible_text({"content": "こんにちは", "reasoning": "think"})
        == "こんにちは"
    )
    assert (
        llm._assistant_visible_text(
            {"content": None, "reasoning_content": "think"}
        )
        == ""
    )
    assert (
        llm._assistant_visible_text({"content": "", "reasoning": "think"}) == ""
    )
    assert (
        llm._assistant_visible_text(
            {"content": [{"type": "text", "text": "Hello"}], "reasoning": "think"}
        )
        == "Hello"
    )
