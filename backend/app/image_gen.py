"""源内 Web「画像を生成」ページ向けの /image/generate 実装。

画像生成プロバイダを LiteLLM Proxy へ全面統合・一元化。
OpenAI 互換画像生成・編集機能をサポートし、自己署名証明書接続に対応。
"""

from __future__ import annotations

import os
import base64
import uuid
import time
import threading
from typing import Any

import httpx
from openai import AsyncOpenAI

# 環境変数
ALLOW_CLOUD_API = os.environ.get("ALLOW_CLOUD_API", "false").lower() == "true"
LITELLM_IMAGE_MODEL = os.environ.get("LITELLM_IMAGE_MODEL", "imagen-4")
LITELLM_IMAGE_URL = os.environ.get("LITELLM_IMAGE_URL", "http://litellm:4000/v1")
LITELLM_IMAGE_API_KEY = os.environ.get("LITELLM_IMAGE_API_KEY", "not-needed")
VERIFY_SSL = os.environ.get("VERIFY_SSL", "true").lower() == "true"

# 固定保存先の管理
FILES_DIR = os.environ.get("FILES_DIR", "/data/files")
STATIC_GENERATIONS_DIR = os.path.join(FILES_DIR, "generations")
IMAGE_TTL_DAYS = int(os.environ.get("IMAGE_TTL_DAYS", "30"))

_cleanup_started = False
_cleanup_lock = threading.Lock()


def get_openai_client() -> AsyncOpenAI:
    """自己署名 SSL 回避対応を施した AsyncOpenAI クライアントを生成する。"""
    http_client = httpx.AsyncClient(verify=VERIFY_SSL)
    return AsyncOpenAI(
        base_url=LITELLM_IMAGE_URL,
        api_key=LITELLM_IMAGE_API_KEY,
        http_client=http_client,
    )


def _positive_negative_prompts(text_prompt: list[dict[str, Any]]) -> tuple[str, str]:
    positive = ""
    negative = ""
    for item in text_prompt:
        text = (item.get("text") or "").strip()
        if not text:
            continue
        weight = item.get("weight", 1)
        if weight < 0:
            negative = text if not negative else f"{negative}, {text}"
        else:
            positive = text if not positive else f"{positive}, {text}"
    return positive, negative


def _apply_style_preset(prompt: str, style_preset: str | None) -> str:
    preset = (style_preset or "").strip()
    if not preset:
        return prompt
    return f"{prompt}, {preset} style"


async def is_sd_up() -> bool:
    """LiteLLM Proxy の稼働状況を確認する。"""
    try:
        async with httpx.AsyncClient(timeout=2.0, verify=VERIFY_SSL) as client:
            res = await client.get(f"{LITELLM_IMAGE_URL.rstrip('/')}/health")
            if res.status_code == 200:
                return True
    except Exception:
        pass

    try:
        async with httpx.AsyncClient(timeout=2.0, verify=VERIFY_SSL) as client:
            res = await client.get(f"{LITELLM_IMAGE_URL.rstrip('/')}/models")
            return res.status_code == 200
    except Exception:
        return False


async def generate_image_base64(params: dict[str, Any], model_id: str | None = None) -> str:
    """LiteLLM 経由で画像を生成し、base64 文字列を返す。"""
    positive, negative = _positive_negative_prompts(params.get("textPrompt") or [])
    if not positive:
        raise ValueError("プロンプトが空です。")

    positive = _apply_style_preset(positive, params.get("stylePreset"))
    width = int(params.get("width") or 512)
    height = int(params.get("height") or 512)
    size = f"{width}x{height}"

    client = get_openai_client()
    model_name = model_id or LITELLM_IMAGE_MODEL

    kwargs = {
        "model": model_name,
        "prompt": positive,
        "n": 1,
        "size": size,
        "response_format": "b64_json",
    }

    # 標準パラメータが指定されていれば追加
    if "quality" in params:
        kwargs["quality"] = params["quality"]
    if "style" in params:
        kwargs["style"] = params["style"]
    if "extra_body" in params:
        kwargs["extra_body"] = params["extra_body"]

    try:
        response = await client.images.generate(**kwargs)
    except Exception as exc:
        raise RuntimeError(f"画像生成サーバへの接続に失敗しました: {exc}") from exc

    b64_content = response.data[0].b64_json
    if not b64_content:
        raise RuntimeError("画像が生成されませんでした（データが空です）。")
    return b64_content


async def edit_image_base64(
    image_bytes: bytes,
    mask_bytes: bytes | None,
    prompt: str,
    model_id: str | None = None,
    size: str = "1024x1024",
    n: int = 1,
    response_format: str = "b64_json",
) -> str:
    """LiteLLM 経由で画像を編集・再生成し、base64 文字列を返す。"""
    client = get_openai_client()
    model_name = model_id or LITELLM_IMAGE_MODEL

    kwargs = {
        "model": model_name,
        "image": ("image.png", image_bytes, "image/png"),
        "prompt": prompt,
        "n": n,
        "size": size,
        "response_format": response_format,
    }
    if mask_bytes:
        kwargs["mask"] = ("mask.png", mask_bytes, "image/png")

    try:
        response = await client.images.edit(**kwargs)
    except Exception as exc:
        raise RuntimeError(f"画像編集サーバへの接続に失敗しました: {exc}") from exc

    b64_content = response.data[0].b64_json
    if not b64_content:
        raise RuntimeError("画像が編集されませんでした（データが空です）。")
    return b64_content


def save_generated_image(b64_data: str) -> str:
    """Base64 データをデコードして STATIC_GENERATIONS_DIR 配下に保存し、静的 URL パスを返す。"""
    if not b64_data:
        raise ValueError("画像データが空です。")

    if "," in b64_data:
        b64_data = b64_data.split(",", 1)[1]

    try:
        img_bytes = base64.b64decode(b64_data)
    except Exception as e:
        raise ValueError(f"Base64 デコードに失敗しました: {e}")

    uuid_str = str(uuid.uuid4())
    filename = f"img_{uuid_str}.png"
    filepath = os.path.join(STATIC_GENERATIONS_DIR, filename)

    os.makedirs(STATIC_GENERATIONS_DIR, exist_ok=True)
    with open(filepath, "wb") as f:
        f.write(img_bytes)

    return f"/static/generations/{filename}"


def _cleanup_loop() -> None:
    while True:
        try:
            now = time.time()
            if os.path.exists(STATIC_GENERATIONS_DIR):
                for filename in os.listdir(STATIC_GENERATIONS_DIR):
                    filepath = os.path.join(STATIC_GENERATIONS_DIR, filename)
                    if os.path.isfile(filepath):
                        mtime = os.path.getmtime(filepath)
                        age_days = (now - mtime) / 86400.0
                        if age_days > IMAGE_TTL_DAYS:
                            try:
                                os.remove(filepath)
                                print(f"[image_gen] TTL expired. Removed file: {filepath}")
                            except Exception as e:
                                print(f"[image_gen] Failed to remove expired file {filepath}: {e}")
        except Exception as e:
            print(f"[image_gen] Background cleanup failed: {e}")
        # 12時間ごとに実行
        time.sleep(43200)


def start_static_cleanup_scheduler() -> None:
    """静的画像の保持期限クリーンアップをバックグラウンドで開始する。"""
    global _cleanup_started
    if _cleanup_started or IMAGE_TTL_DAYS <= 0:
        return
    with _cleanup_lock:
        if _cleanup_started:
            return
        t = threading.Thread(target=_cleanup_loop, name="image-gen-static-cleanup", daemon=True)
        t.start()
        _cleanup_started = True


# 以下は既存のテスト互換性のためのプレースホルダ、あるいは完全に新規構成へのマッピング
IMAGE_PROVIDER = "litellm"
IMAGE_API_URL = ""
SD_API_URL = ""
SD_TIMEOUT = 600.0
def get_effective_provider(model_id: str | None = None) -> str:
    return "litellm"
