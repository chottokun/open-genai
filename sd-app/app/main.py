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
# ホストの A1111 互換 SD サーバ（既定: ホスト of 7860）
SD_API_URL = os.environ.get("SD_API_URL", "http://host.docker.internal:7860").rstrip("/")
SD_TIMEOUT = float(os.environ.get("SD_TIMEOUT", "600"))

# --- ローカル/クラウド（LiteLLM）画像生成切り替え設定 ---
ALLOW_CLOUD_API = os.environ.get("ALLOW_CLOUD_API", "false").lower() == "true"
IMAGE_PROVIDER = os.environ.get("IMAGE_PROVIDER", "local")   # local | litellm | local_api
IMAGE_API_URL = os.environ.get("IMAGE_API_URL", "http://local-sd-api:8000/v1/images/generations")

def get_effective_provider() -> str:
    allow_cloud = ALLOW_CLOUD_API or os.environ.get("ALLOW_CLOUD_API", "false").lower() == "true"
    prov = IMAGE_PROVIDER or os.environ.get("IMAGE_PROVIDER", "local")
    
    # 接続先が Docker 内部のクローズドなローカルアドレス（litellm 等）であれば、
    # 外部にキーが漏洩するリスクがないため allow_cloud=False でも通過させる
    is_local_target = False
    url = LITELLM_IMAGE_URL or ""
    if "litellm:" in url or "localhost" in url or "127.0.0.1" in url or "host.docker.internal" in url:
        is_local_target = True

    if prov == "litellm" and not allow_cloud and not is_local_target:
        # クラウドAPI利用が許可されていない場合は、意図しない課金・送信を防ぐため強制的にlocalにフォールバックする
        return "local"
    return prov

LITELLM_IMAGE_MODEL = os.environ.get("LITELLM_IMAGE_MODEL", "imagen-4")
LITELLM_IMAGE_URL = os.environ.get("LITELLM_IMAGE_URL", "http://litellm:4000/v1")
LITELLM_IMAGE_API_KEY = os.environ.get("LITELLM_IMAGE_API_KEY", "not-needed")

app = FastAPI(title="Open GENAI Stable Diffusion App", version="0.1.0")


def _check_key(x_api_key: str | None) -> JSONResponse | None:
    if API_KEY and x_api_key != API_KEY:
        return JSONResponse(status_code=401, content={"error": "invalid api key"})
    return None


@app.get("/health")
async def health() -> JSONResponse:
    """プロキシ先が利用可能か、またはLiteLLMが設定されているかを反映する。

    未起動なら 503 を返し、源内 Web の一覧から自動的に隠れるようにする。
    """
    prov = get_effective_provider()
    if prov == "litellm":
        return JSONResponse(content={"status": "ok", "provider": "litellm", "model": LITELLM_IMAGE_MODEL})

    if prov == "local_api":
        try:
            from urllib.parse import urlparse
            parsed = urlparse(IMAGE_API_URL)
            health_url = f"{parsed.scheme}://{parsed.netloc}/health"
            async with httpx.AsyncClient(timeout=3) as client:
                res = await client.get(health_url)
            if res.status_code == 200:
                return JSONResponse(content={"status": "ok", "provider": "local_api", "upstream": IMAGE_API_URL})
        except Exception:
            pass
        return JSONResponse(
            status_code=503,
            content={"status": "upstream-unavailable", "upstream": IMAGE_API_URL},
        )

    try:
        async with httpx.AsyncClient(timeout=3) as client:
            res = await client.get(f"{SD_API_URL}/sdapi/v1/sd-models")
        if res.status_code == 200:
            return JSONResponse(content={"status": "ok", "provider": "local", "upstream": SD_API_URL})
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

    prov = get_effective_provider()
    if prov == "local":
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
    elif prov == "local_api":
        payload = {
            "prompt": prompt,
            "size": f"{size}x{size}",
            "n": 1,
            "response_format": "b64_json"
        }

        try:
            async with httpx.AsyncClient(timeout=SD_TIMEOUT) as client:
                res = await client.post(IMAGE_API_URL, json=payload)
        except httpx.HTTPError as e:
            return {"outputs": f"ローカル画像生成API（local-sd-api）への接続に失敗しました: {e}"}

        if res.status_code != 200:
            return {"outputs": f"画像生成に失敗しました (status: {res.status_code}, detail: {res.text})"}

        data = res.json()
        img_data_list = data.get("data") or []
        if not img_data_list:
            return {"outputs": "画像が生成されませんでした。"}

        artifacts = []
        for i, img_obj in enumerate(img_data_list):
            b64_content = img_obj.get("b64_json")
            if b64_content:
                artifacts.append({"content": b64_content, "display_name": f"generated_{i + 1}.png"})

        if not artifacts:
            return {"outputs": "画像のデータ処理に失敗しました。"}

        return {
            "outputs": f"プロンプト「{prompt}」で画像を生成しました（画像生成(ローカルAPI)）。",
            "artifacts": artifacts,
        }
    else:
        # LiteLLM/クラウドAPI経由での画像生成
        payload = {
            "prompt": prompt,
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
        except httpx.HTTPError as e:
            return {"outputs": f"クラウド画像生成サーバへの接続に失敗しました: {e}"}

        if res.status_code != 200:
            return {"outputs": f"画像生成に失敗しました (status: {res.status_code}, detail: {res.text})"}

        data = res.json()
        img_data_list = data.get("data") or []
        if not img_data_list:
            return {"outputs": "画像が生成されませんでした。"}

        artifacts = []
        for i, img_obj in enumerate(img_data_list):
            b64_content = img_obj.get("b64_json")
            if not b64_content:
                img_url = img_obj.get("url")
                if img_url:
                    try:
                        async with httpx.AsyncClient(timeout=30) as client:
                            img_res = await client.get(img_url)
                        if img_res.status_code == 200:
                            import base64
                            b64_content = base64.b64encode(img_res.content).decode("utf-8")
                    except Exception as e:
                        return {"outputs": f"生成された画像の取得に失敗しました: {e}"}
            
            if b64_content:
                artifacts.append({"content": b64_content, "display_name": f"generated_{i + 1}.png"})

        if not artifacts:
            return {"outputs": "画像のデータ処理に失敗しました。"}

        return {
            "outputs": f"プロンプト「{prompt}」で画像を生成しました（モデル: {LITELLM_IMAGE_MODEL}）。",
            "artifacts": artifacts,
        }

