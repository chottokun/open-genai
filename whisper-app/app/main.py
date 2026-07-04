"""文字起こし「AI アプリ」マイクロサービス（faster-whisper / CPU）。

源内の AI アプリ同期プロトコルに準拠:
- リクエスト: { "inputs": { "audio": ..., "language": "auto|ja|en", "files": [...] } }
  音声は inputs.files に base64 で入る（exApp のファイル入力仕様）。
- レスポンス: { "outputs": "<文字起こしテキスト(Markdown)>" }

Amazon Transcribe + S3 への依存を、ローカルの faster-whisper で置き換える。
"""

from __future__ import annotations

import base64
import os
import tempfile
from typing import Any

from fastapi import FastAPI, Header, Request
from fastapi.responses import JSONResponse

API_KEY = os.environ.get("RAG_API_KEY", "local-rag-key")
WHISPER_MODEL = os.environ.get("WHISPER_MODEL", "medium")
WHISPER_COMPUTE = os.environ.get("WHISPER_COMPUTE", "int8")
WHISPER_DEVICE = os.environ.get("WHISPER_DEVICE", "cpu")

# --- ローカル/クラウド切り替え設定 ---
ALLOW_CLOUD_API = os.environ.get("ALLOW_CLOUD_API", "false").lower() == "true"
WHISPER_PROVIDER = os.environ.get("WHISPER_PROVIDER", "local")  # local | litellm

if WHISPER_PROVIDER == "litellm" and not ALLOW_CLOUD_API:
    # クラウドAPI利用が許可されていない場合は、意図しない課金・送信を防ぐため強制的にlocalにフォールバックする
    WHISPER_PROVIDER = "local"

LITELLM_AUDIO_MODEL = os.environ.get("LITELLM_AUDIO_MODEL", "whisper-cloud")
LITELLM_AUDIO_URL = os.environ.get("LITELLM_AUDIO_URL", "http://litellm:4000/v1")
LITELLM_API_KEY = os.environ.get("LITELLM_API_KEY", "not-needed")

app = FastAPI(title="Open GENAI Whisper App", version="0.1.0")

_model = None
_model_error: str | None = None


def _get_model():
    """モデルは初回利用時に遅延ロード（起動を速く保つ）。"""
    global _model, _model_error
    if _model is not None:
        return _model
    try:
        from faster_whisper import WhisperModel

        _model = WhisperModel(
            WHISPER_MODEL, device=WHISPER_DEVICE, compute_type=WHISPER_COMPUTE
        )
        _model_error = None
    except Exception as e:  # noqa: BLE001
        _model_error = str(e)
        raise
    return _model


def _check_key(x_api_key: str | None) -> JSONResponse | None:
    if API_KEY and x_api_key != API_KEY:
        return JSONResponse(status_code=401, content={"error": "invalid api key"})
    return None


@app.get("/health")
async def health() -> dict[str, Any]:
    return {"status": "ok", "model": WHISPER_MODEL, "loaded": _model is not None, "provider": WHISPER_PROVIDER}


def _extract_audio(inputs: dict[str, Any]) -> tuple[str, bytes] | None:
    """inputs.files から最初の音声ファイル(filename, bytes)を取り出す。"""
    for entry in inputs.get("files") or []:
        for f in entry.get("files", []):
            content = f.get("content", "")
            if not content:
                continue
            try:
                raw = base64.b64decode(content)
            except Exception:  # noqa: BLE001 # nosec B112
                continue
            return f.get("filename", "audio"), raw
    return None


@app.post("/invoke")
async def invoke(request: Request, x_api_key: str | None = Header(default=None)) -> Any:
    err = _check_key(x_api_key)
    if err:
        return err

    body = await request.json()
    inputs = body.get("inputs", body)

    audio = _extract_audio(inputs)
    if not audio:
        return {"outputs": "音声ファイルが添付されていません。音声を添付してください。"}

    filename, raw = audio
    language = inputs.get("language") or "auto"
    lang_arg = None if language in ("auto", "", None) else language

    suffix = os.path.splitext(filename)[1] or ".wav"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp.write(raw)
        tmp_path = tmp.name

    try:
        if WHISPER_PROVIDER == "local":
            try:
                model = _get_model()
            except Exception as e:  # noqa: BLE001
                return {"outputs": f"[文字起こしモデルの読み込みに失敗しました] {e}"}

            try:
                segments, info = model.transcribe(tmp_path, language=lang_arg, vad_filter=True)
                lines: list[str] = []
                for seg in segments:
                    start = _fmt_ts(seg.start)
                    end = _fmt_ts(seg.end)
                    lines.append(f"[{start} - {end}] {seg.text.strip()}")
                transcript = "\n".join(lines) if lines else "（音声から文字を検出できませんでした）"
                detected = getattr(info, "language", lang_arg or "auto")
                outputs = f"**検出言語**: {detected}\n\n{transcript}"
                return {"outputs": outputs}
            except Exception as e:  # noqa: BLE001
                return {"outputs": f"[文字起こし中にエラーが発生しました] {e}"}
        else:
            # LiteLLM/クラウドAPI経由での呼び出し
            try:
                import requests

                url = f"{LITELLM_AUDIO_URL.rstrip('/')}/audio/transcriptions"
                headers = {}
                if LITELLM_API_KEY and LITELLM_API_KEY != "not-needed":
                    headers["Authorization"] = f"Bearer {LITELLM_API_KEY}"

                # 音声ファイルを multipart/form-data で送信
                with open(tmp_path, "rb") as f_in:
                    files = {
                        "file": (filename, f_in, "audio/mpeg")
                    }
                    data = {
                        "model": LITELLM_AUDIO_MODEL
                    }
                    if lang_arg:
                        data["language"] = lang_arg

                    response = requests.post(url, headers=headers, files=files, data=data, timeout=600)
                
                if response.status_code != 200:
                    return {"outputs": f"[LiteLLM 文字起こしAPIエラー: {response.status_code}] {response.text}"}

                res_json = response.json()
                transcript = res_json.get("text", "（音声から文字を検出できませんでした）")
                outputs = f"**文字起こし結果 (LiteLLM: {LITELLM_AUDIO_MODEL})**:\n\n{transcript}"
                return {"outputs": outputs}
            except Exception as e:  # noqa: BLE001
                return {"outputs": f"[LiteLLM 文字起こし中にエラーが発生しました] {e}"}
    finally:
        try:
            os.remove(tmp_path)
        except OSError:
            pass


def _fmt_ts(seconds: float) -> str:
    seconds = int(seconds or 0)
    m, s = divmod(seconds, 60)
    h, m = divmod(m, 60)
    if h:
        return f"{h:02d}:{m:02d}:{s:02d}"
    return f"{m:02d}:{s:02d}"

