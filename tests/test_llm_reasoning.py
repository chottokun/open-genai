from __future__ import annotations

import importlib.util
from pathlib import Path


def load_service_module(rel_path: str):
    file_path = Path(__file__).parent.parent / rel_path
    spec = importlib.util.spec_from_file_location(file_path.stem, file_path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Cannot load module at {file_path}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_assistant_visible_text_skips_reasoning() -> None:
    llm = load_service_module("backend/app/llm.py")
    assert llm._assistant_visible_text({"content": "こんにちは", "reasoning": "think"}) == "こんにちは"
    assert llm._assistant_visible_text({"content": None, "reasoning_content": "think"}) == ""
    assert llm._assistant_visible_text({"content": "", "reasoning": "think"}) == ""
    assert llm._assistant_visible_text({"content": [{"type": "text", "text": "Hello"}]}) == "Hello"
