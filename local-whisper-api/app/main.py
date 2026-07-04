import os
import tempfile
from typing import Any
from fastapi import FastAPI, File, Form, UploadFile
from fastapi.responses import JSONResponse
from faster_whisper import WhisperModel

app = FastAPI(title="Local Whisper API", version="1.0.0")

# 環境変数から設定を読み込む
DEVICE = os.environ.get("AUDIO_INFERENCE_DEVICE", "cpu")
COMPUTE_TYPE = os.environ.get("AUDIO_COMPUTE_TYPE", "int8")
MODEL_NAME = os.environ.get("AUDIO_MODEL_NAME", "kotoba-tech/kotoba-whisper-v1.0-faster")

# 起動時に音声モデルを読み込む
model = WhisperModel(MODEL_NAME, device=DEVICE, compute_type=COMPUTE_TYPE)


@app.get("/health")
async def health() -> dict[str, Any]:
    return {
        "status": "ok",
        "model": MODEL_NAME,
        "device": DEVICE,
        "compute_type": COMPUTE_TYPE
    }


@app.post("/v1/audio/transcriptions")
async def transcribe(
    file: UploadFile = File(...),
    language: str | None = Form(None)
) -> Any:
    # 音声データを一時ファイルに保存
    suffix = os.path.splitext(file.filename or "")[1] or ".wav"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        try:
            content = await file.read()
            tmp.write(content)
            tmp_path = tmp.name
        except Exception as e:
            return JSONResponse(status_code=500, content={"error": f"Failed to save temp file: {e}"})

    try:
        # 文字起こし実行
        lang_arg = None if language in ("auto", "", None) else language
        segments, info = model.transcribe(tmp_path, language=lang_arg, vad_filter=True)
        
        # テキストの結合
        lines = [seg.text for seg in segments]
        transcript = "".join(lines)
        return {"text": transcript}
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": f"Transcription error: {e}"})
    finally:
        # 一時ファイルの削除
        try:
            os.remove(tmp_path)
        except OSError:
            pass
