"""画像生成「AI アプリ」マイクロサービス。

macOS の Docker は GPU(Metal/MPS) を使えないため、コンテナ内で SD を動かすと
極端に遅い。そこで Ollama と同様、**ホスト側で動く Stable Diffusion サーバ
(AUTOMATIC1111 互換 API: /sdapi/v1/txt2img)** にプロキシする構成とする。

- リクエスト: { "inputs": { "prompt", "negative_prompt", "steps", "size" } }
- レスポンス: { "outputs": "...", "artifacts": [{ "content": base64png, "display_name" }] }

Amazon Bedrock(画像) への依存を、ホストのオープンな SD サーバで置き換える。
"""

from __future__ import annotations

import os
from typing import Any

import httpx
from fastapi import FastAPI, Header, Request
from fastapi.responses import JSONResponse

API_KEY = os.environ.get("RAG_API_KEY", "local-rag-key")
# ホストの A1111 互換 SD サーバ（既定: ホストの 7860）
SD_API_URL = os.environ.get("SD_API_URL", "http://host.docker.internal:7860").rstrip("/")
SD_TIMEOUT = float(os.environ.get("SD_TIMEOUT", "600"))

app = FastAPI(title="Open GENAI Stable Diffusion App", version="0.1.0")


def _check_key(x_api_key: str | None) -> JSONResponse | None:
    if API_KEY and x_api_key != API_KEY:
        return JSONResponse(status_code=401, content={"error": "invalid api key"})
    return None


@app.get("/health")
async def health() -> JSONResponse:
    """上流(ホストの SD サーバ)が到達可能かを反映する。

    未起動なら 503 を返し、源内 Web の一覧から自動的に隠れるようにする。
    """
    try:
        async with httpx.AsyncClient(timeout=3) as client:
            res = await client.get(f"{SD_API_URL}/sdapi/v1/sd-models")
        if res.status_code == 200:
            return JSONResponse(content={"status": "ok", "upstream": SD_API_URL})
    except httpx.HTTPError:
        pass
    return JSONResponse(
        status_code=503,
        content={"status": "upstream-unavailable", "upstream": SD_API_URL},
    )


@app.post("/invoke")
async def invoke(request: Request, x_api_key: str | None = Header(default=None)) -> Any:
    err = _check_key(x_api_key)
    if err:
        return err

    body = await request.json()
    inputs = body.get("inputs", body)
    prompt = (inputs.get("prompt") or "").strip()
    if not prompt:
        return {"outputs": "プロンプトが空です。生成したい画像の説明を入力してください。"}

    try:
        size = int(inputs.get("size") or 512)
    except (TypeError, ValueError):
        size = 512
    try:
        steps = int(inputs.get("steps") or 20)
    except (TypeError, ValueError):
        steps = 20

    payload = {
        "prompt": prompt,
        "negative_prompt": inputs.get("negative_prompt") or "",
        "steps": steps,
        "width": size,
        "height": size,
    }

    try:
        async with httpx.AsyncClient(timeout=SD_TIMEOUT) as client:
            res = await client.post(f"{SD_API_URL}/sdapi/v1/txt2img", json=payload)
    except httpx.HTTPError as e:
        return {
            "outputs": (
                "ホストの画像生成サーバ(A1111 互換)に接続できませんでした。"
                f"`{SD_API_URL}` で起動しているか確認してください: {e}"
            )
        }

    if res.status_code != 200:
        return {"outputs": f"画像生成に失敗しました (status: {res.status_code})"}

    data = res.json()
    images = data.get("images") or []
    if not images:
        return {"outputs": "画像が生成されませんでした。"}

    artifacts = [
        {"content": img, "display_name": f"generated_{i + 1}.png"}
        for i, img in enumerate(images)
    ]
    return {
        "outputs": f"プロンプト「{prompt}」で画像を生成しました。",
        "artifacts": artifacts,
    }
