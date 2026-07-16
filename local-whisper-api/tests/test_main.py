import sys
from unittest.mock import MagicMock, patch
sys.modules["faster_whisper"] = MagicMock()

import os
import pytest
from fastapi.testclient import TestClient

# テスト前に環境変数をモック設定
os.environ["AUDIO_INFERENCE_DEVICE"] = "cpu"
os.environ["AUDIO_COMPUTE_TYPE"] = "int8"
os.environ["AUDIO_MODEL_NAME"] = "dummy-model"

# appのインポート
from app.main import app

client = TestClient(app)


def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    res_json = response.json()
    assert res_json["status"] == "ok"
    assert res_json["model"] == "dummy-model"


@patch("app.main.model")
def test_transcribe_success(mock_model):
    # WhisperModel.transcribe の戻り値をモック化
    # transcribe は (segments_generator, info_object) のタプルを返す
    mock_segment = MagicMock()
    mock_segment.text = "こんにちは、音声認識のテストです。"
    
    mock_info = MagicMock()
    mock_info.language = "ja"
    
    mock_model.transcribe.return_value = ([mock_segment], mock_info)

    # ダミー音声データを送信
    files = {"file": ("test.wav", b"dummy_audio_content", "audio/wav")}
    data = {"language": "ja"}

    response = client.post("/v1/audio/transcriptions", files=files, data=data)
    
    assert response.status_code == 200
    assert response.json() == {"text": "こんにちは、音声認識のテストです。"}
    
    # transcribeが正しく呼ばれたか検証
    mock_model.transcribe.assert_called_once()
    args, kwargs = mock_model.transcribe.call_args
    assert kwargs["language"] == "ja"


def test_transcribe_no_file():
    # ファイルなしでポストした場合は 422 Unprocessable Entity
    response = client.post("/v1/audio/transcriptions")
    assert response.status_code == 422
