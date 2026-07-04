import sys
from unittest.mock import MagicMock

# ローカル環境に diffusers (および torch) がない場合のための sys.modules モック
mock_diffusers = MagicMock()
sys.modules["diffusers"] = mock_diffusers
sys.modules["torch"] = MagicMock()

import os
from unittest.mock import patch
import pytest
from fastapi.testclient import TestClient

# テスト前に環境変数をモック設定
os.environ["IMAGE_INFERENCE_DEVICE"] = "cpu"
os.environ["IMAGE_MODEL_NAME"] = "dummy-sd-model"

# appのインポート
from app.main import app

client = TestClient(app)


def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    res_json = response.json()
    assert res_json["status"] == "ok"
    assert res_json["model"] == "dummy-sd-model"


@patch("app.main.pipe")
def test_generate_image_success(mock_pipe):
    # パイプラインの推論結果をモック化
    mock_image = MagicMock()
    def mock_save(fp, format=None):
        if isinstance(fp, str):
            with open(fp, "wb") as f:
                f.write(b"dummy_png_bytes")
        else:
            fp.write(b"dummy_png_bytes")
    mock_image.save = mock_save
    
    mock_result = MagicMock()
    mock_result.images = [mock_image]
    mock_pipe.return_value = mock_result

    # OpenAI互換画像生成リクエストを送信
    payload = {
        "prompt": "a beautiful forest",
        "size": "512x512",
        "n": 1
    }
    response = client.post("/v1/images/generations", json=payload)
    assert response.status_code == 200
    res_json = response.json()
    assert "data" in res_json
    assert len(res_json["data"]) == 1
    
    import base64
    expected_b64 = base64.b64encode(b"dummy_png_bytes").decode("utf-8")
    assert res_json["data"][0]["b64_json"] == expected_b64
    
    mock_pipe.assert_called_once()
    args, kwargs = mock_pipe.call_args
    assert kwargs["prompt"] == "a beautiful forest"
    assert kwargs["width"] == 512
    assert kwargs["height"] == 512


def test_generate_image_missing_prompt():
    # プロンプトなしの場合は 400 もしくは 422 などのエラーになることをテスト
    # payloadのバリデーションをクリアするため、FastAPIのスキーマ定義に対応
    response = client.post("/v1/images/generations", json={})
    assert response.status_code == 422
