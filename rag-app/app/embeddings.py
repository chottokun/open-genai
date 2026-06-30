"""OpenAI 互換 API による埋め込み / 生成。

Ollama の OpenAI 互換エンドポイント(/v1)を既定とするが、OPENAI_BASE_URL を
変えれば任意の OpenAI 互換サーバに向けられる。
"""

from __future__ import annotations

import json
import os
from typing import Any, AsyncIterator

import httpx

OLLAMA_BASE_URL = os.environ.get("OLLAMA_BASE_URL", "http://host.docker.internal:11434")
OPENAI_BASE_URL = (
    os.environ.get("OPENAI_BASE_URL") or f"{OLLAMA_BASE_URL.rstrip('/')}/v1"
).rstrip("/")
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY") or "ollama"
EMBED_MODEL = os.environ.get("EMBED_MODEL", "mxbai-embed-large")
RAG_MODEL = os.environ.get("RAG_MODEL", "gpt-oss:20b")

# 検索クエリ用、およびドキュメントインデックス用のプレフィックスを環境変数から取得可能にする（後方互換性維持）
QUERY_PREFIX = os.environ.get("EMBED_QUERY_PREFIX", "Represent this sentence for searching relevant passages: ")
DOC_PREFIX = os.environ.get("EMBED_DOC_PREFIX", "")


def _headers() -> dict[str, str]:
    return {
        "Authorization": f"Bearer {OPENAI_API_KEY}",
        "Content-Type": "application/json",
    }


async def embed(input_data: str | list[str], *, is_query: bool = False) -> list[float] | list[list[float]]:
    """単一の文字列または文字列のリストを埋め込む。"""
    prefix = QUERY_PREFIX if is_query else DOC_PREFIX

    if isinstance(input_data, str):
        prompt = (prefix + input_data) if prefix else input_data
    else:
        prompt = [(prefix + t) if prefix else t for t in input_data]

    async with httpx.AsyncClient(timeout=120) as client:
        res = await client.post(
            f"{OPENAI_BASE_URL}/embeddings",
            json={"model": EMBED_MODEL, "input": prompt},
            headers=_headers(),
        )
        res.raise_for_status()
        data = res.json()

    if isinstance(input_data, str):
        return data["data"][0]["embedding"]
    # index でソートして、返却する埋め込みベクトルの順序が入力と一致するように保証する
    sorted_data = sorted(data["data"], key=lambda x: x.get("index", 0))
    return [d["embedding"] for d in sorted_data]


async def generate(messages: list[dict[str, Any]]) -> str:
    async with httpx.AsyncClient(timeout=600) as client:
        res = await client.post(
            f"{OPENAI_BASE_URL}/chat/completions",
            json={"model": RAG_MODEL, "messages": messages, "stream": False},
            headers=_headers(),
        )
        res.raise_for_status()
        data = res.json()
    choices = data.get("choices") or [{}]
    return (choices[0].get("message") or {}).get("content", "") or ""


async def generate_stream(messages: list[dict[str, Any]]) -> AsyncIterator[str]:
    async with httpx.AsyncClient(timeout=600) as client:
        async with client.stream(
            "POST",
            f"{OPENAI_BASE_URL}/chat/completions",
            json={"model": RAG_MODEL, "messages": messages, "stream": True},
            headers=_headers(),
        ) as res:
            res.raise_for_status()
            async for line in res.aiter_lines():
                line = line.strip()
                if not line or not line.startswith("data:"):
                    continue
                payload = line[len("data:") :].strip()
                if payload == "[DONE]":
                    return
                try:
                    chunk = json.loads(payload)
                except json.JSONDecodeError:
                    continue
                delta = (chunk.get("choices") or [{}])[0].get("delta") or {}
                text = delta.get("content") or ""
                if text:
                    yield text
