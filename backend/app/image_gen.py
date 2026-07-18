"""源内 Web「画像を生成」ページ向けの /image/generate 実装。

画像生成プロバイダ (local | litellm | local_api) に応じて、
ローカルの SD サーバー、LiteLLM 経由のクラウドモデル、または local-sd-api を呼び分ける。
"""

from __future__ import annotations

import os
import base64
from typing import Any

import httpx

# 環境変数
ALLOW_CLOUD_API = os.environ.get("ALLOW_CLOUD_API", "false").lower() == "true"
IMAGE_PROVIDER = os.environ.get("IMAGE_PROVIDER", "local")  # local | litellm | local_api
IMAGE_API_URL = os.environ.get("IMAGE_API_URL", "http://local-sd-api:8000/v1/images/generations")

SD_API_URL = os.environ.get("SD_API_URL", "http://host.docker.internal:7860").rstrip("/")
SD_TIMEOUT = float(os.environ.get("SD_TIMEOUT", "600"))

LITELLM_IMAGE_MODEL = os.environ.get("LITELLM_IMAGE_MODEL", "imagen-4")
LITELLM_IMAGE_URL = os.environ.get("LITELLM_IMAGE_URL", "http://litellm:4000/v1")
LITELLM_IMAGE_API_KEY = os.environ.get("LITELLM_IMAGE_API_KEY", "not-needed")

LOCAL_SD_MODEL_ID = "local-sd"


def get_effective_provider() -> str:
    prov = IMAGE_PROVIDER or "local"
    
    # 接続先が Docker 内部のクローズドなローカルアドレス（litellm 等）であれば、
    # 外部にキーが漏洩するリスクがないため allow_cloud=False でも通過させる
    is_local_target = False
    url = LITELLM_IMAGE_URL or ""
    if "litellm:" in url or "localhost" in url or "127.0.0.1" in url or "host.docker.internal" in url:
        is_local_target = True

    if prov == "litellm" and not ALLOW_CLOUD_API and not is_local_target:
        return "local"
    return prov


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


def build_a1111_payload(params: dict[str, Any]) -> dict[str, Any]:
    """GenerateImageParams 相当を A1111 txt2img / img2img 用 payload に変換する。"""
    positive, negative = _positive_negative_prompts(params.get("textPrompt") or [])
    if not positive:
        raise ValueError("プロンプトが空です。")

    positive = _apply_style_preset(positive, params.get("stylePreset"))

    width = int(params.get("width") or 512)
    height = int(params.get("height") or 512)
    steps = int(params.get("step") or 20)
    cfg_scale = float(params.get("cfgScale") or 7)
    seed = int(params.get("seed") if params.get("seed") is not None else -1)

    payload: dict[str, Any] = {
        "prompt": positive,
        "negative_prompt": negative,
        "steps": steps,
        "width": width,
        "height": height,
        "cfg_scale": cfg_scale,
        "seed": seed,
    }

    init_image = (params.get("initImage") or "").strip()
    if init_image:
        payload["init_images"] = [init_image]
        payload["denoising_strength"] = float(params.get("imageStrength") or 0.35)

    return payload


async def is_sd_up() -> bool:
    """現在のプロバイダの稼働状況を確認する。"""
    prov = get_effective_provider()
    
    if prov == "litellm":
        # LiteLLM サーバーへの疎通を確認
        try:
            async with httpx.AsyncClient(timeout=2.0) as client:
                res = await client.get(f"{LITELLM_IMAGE_URL.rstrip('/')}/health")
            # LiteLLMの/healthが200を返す、あるいは疎通できればOKとする
            if res.status_code == 200:
                return True
        except httpx.HTTPError:
            pass

        try:
            async with httpx.AsyncClient(timeout=2.0) as client:
                # /healthがダメならモデル一覧取得などで疎通チェック
                res = await client.get(f"{LITELLM_IMAGE_URL.rstrip('/')}/models")
            return res.status_code == 200
        except httpx.HTTPError:
            return False

    if prov == "local_api":
        try:
            from urllib.parse import urlparse
            parsed = urlparse(IMAGE_API_URL)
            health_url = f"{parsed.scheme}://{parsed.netloc}/health"
            async with httpx.AsyncClient(timeout=2.0) as client:
                res = await client.get(health_url)
            return res.status_code == 200
        except Exception:
            return False

    # local (Stable Diffusion) の場合
    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            res = await client.get(f"{SD_API_URL}/sdapi/v1/sd-models")
        return res.status_code == 200
    except httpx.HTTPError:
        return False


async def generate_image_base64(params: dict[str, Any]) -> str:
    """現在のプロバイダで画像を生成し、base64 文字列を返す。"""
    prov = get_effective_provider()
    positive, negative = _positive_negative_prompts(params.get("textPrompt") or [])
    if not positive:
        raise ValueError("プロンプトが空です。")

    positive = _apply_style_preset(positive, params.get("stylePreset"))
    width = int(params.get("width") or 512)
    height = int(params.get("height") or 512)
    size = max(width, height)

    if prov == "local":
        payload = build_a1111_payload(params)
        init_image = (params.get("initImage") or "").strip()
        endpoint = "img2img" if init_image else "txt2img"

        try:
            async with httpx.AsyncClient(timeout=SD_TIMEOUT) as client:
                res = await client.post(
                    f"{SD_API_URL}/sdapi/v1/{endpoint}",
                    json=payload,
                )
        except httpx.HTTPError as exc:
            raise RuntimeError(
                "ホストの画像生成サーバ(A1111 互換)に接続できませんでした。"
                f"`{SD_API_URL}` で起動しているか確認してください: {exc}"
            ) from exc

        if res.status_code != 200:
            raise RuntimeError(f"画像生成に失敗しました (status: {res.status_code})")

        data = res.json()
        images = data.get("images") or []
        if not images:
            raise RuntimeError("画像が生成されませんでした。")

        image = images[0]
        if image.startswith("data:"):
            image = image.split(",", 1)[1]
        return image

    elif prov == "local_api":
        payload = {
            "prompt": positive,
            "size": f"{size}x{size}",
            "n": 1,
            "response_format": "b64_json"
        }

        try:
            async with httpx.AsyncClient(timeout=SD_TIMEOUT) as client:
                res = await client.post(IMAGE_API_URL, json=payload)
        except httpx.HTTPError as exc:
            raise RuntimeError(f"ローカル画像生成API（local-sd-api）への接続に失敗しました: {exc}") from exc

        if res.status_code != 200:
            raise RuntimeError(f"画像生成に失敗しました (status: {res.status_code}, detail: {res.text})")

        data = res.json()
        img_data_list = data.get("data") or []
        if not img_data_list:
            raise RuntimeError("画像が生成されませんでした。")

        b64_content = img_data_list[0].get("b64_json")
        if not b64_content:
            raise RuntimeError("画像のデータ処理に失敗しました。")
        return b64_content

    else:
        # LiteLLM/クラウドAPI経由での画像生成
        payload = {
            "prompt": positive,
            "model": LITELLM_IMAGE_MODEL,
            "n": 1,
            "size": f"{size}x{size}",
            "response_format": "b64_json"
        }
        
        headers = {}
        if LITELLM_IMAGE_API_KEY and LITELLM_IMAGE_API_KEY != "not-needed":
            headers["Authorization"] = f"Bearer {LITELLM_IMAGE_API_KEY}"

        url = f"{LITELLM_IMAGE_URL.rstrip('/')}/images/generations"

        try:
            async with httpx.AsyncClient(timeout=SD_TIMEOUT) as client:
                res = await client.post(url, json=payload, headers=headers)
        except httpx.HTTPError as exc:
            raise RuntimeError(f"クラウド画像生成サーバへの接続に失敗しました: {exc}") from exc

        if res.status_code != 200:
            raise RuntimeError(f"画像生成に失敗しました (status: {res.status_code}, detail: {res.text})")

        data = res.json()
        img_data_list = data.get("data") or []
        if not img_data_list:
            raise RuntimeError("画像が生成されませんでした。")

        img_obj = img_data_list[0]
        b64_content = img_obj.get("b64_json")
        if not b64_content:
            # URLからダウンロードするフォールバック
            img_url = img_obj.get("url")
            if img_url:
                try:
                    async with httpx.AsyncClient(timeout=30) as client:
                        img_res = await client.get(img_url)
                    if img_res.status_code == 200:
                        b64_content = base64.b64encode(img_res.content).decode("utf-8")
                except Exception as exc:
                    raise RuntimeError(f"生成された画像の取得に失敗しました: {exc}") from exc

        if not b64_content:
            raise RuntimeError("画像のデータ処理に失敗しました。")
        return b64_content
