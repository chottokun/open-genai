import base64
import json
import os
import uuid
from typing import Any

from . import storage

FILES_DIR = os.environ.get("FILES_DIR", "/data/files")
PUBLIC_BASE_URL = os.environ.get("PUBLIC_BASE_URL", "http://localhost:8000")
IMAGE_RESULT_EXTRA_NAME = "open-genai-generated-image"


def _safe_path(key: str) -> str:
    """FILES_DIR 配下に収まる安全な絶対パスへ解決する（パストラバーサル防止）。"""
    if ".." in key or key.startswith("/") or "\x00" in key:
        raise ValueError("invalid path")

    base = os.path.abspath(FILES_DIR)
    full = os.path.normpath(os.path.join(base, key))
    if not full.startswith(base + os.sep) and full != base:
        raise ValueError("invalid path")
    return full


async def persist_image_result(
    chat_id: str,
    message_id: str,
    user_id: str,
    images_b64: list[str],
    meta: dict[str, Any],
) -> str | None:
    """画像生成結果をデコードしてローカルディスクに保存し、メッセージの extraData を更新する。"""
    stored_images: list[dict[str, str]] = []
    for b64 in images_b64:
        if not b64:
            continue
        raw_str = b64.split(",", 1)[1] if isinstance(b64, str) and "," in b64 else b64
        try:
            raw = base64.b64decode(raw_str)
        except (ValueError, TypeError):
            continue
        key = f"image-gen/{chat_id}/{message_id}/{uuid.uuid4().hex}.png"
        full = _safe_path(key)
        os.makedirs(os.path.dirname(full), exist_ok=True)
        with open(full, "wb") as f:
            f.write(raw)
        stored_images.append({"fileUrl": f"{PUBLIC_BASE_URL}/files/{key}"})

    if not stored_images:
        raise ValueError("images are empty")

    payload = {"version": 1, **meta, "images": stored_images}
    extra_data = [
        {
            "type": "json",
            "name": IMAGE_RESULT_EXTRA_NAME,
            "source": {
                "type": "json",
                "mediaType": "application/json",
                "data": json.dumps(payload, ensure_ascii=False),
            },
        }
    ]
    return storage.update_message_extra_data(
        chat_id, user_id, message_id, extra_data
    )
