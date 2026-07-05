import os
import base64
from unittest.mock import MagicMock, patch
import pytest
from fastapi.testclient import TestClient

# モック環境変数の定義
os.environ["RAG_API_KEY"] = "test-key"
os.environ["ALLOW_CLOUD_API"] = "false"
os.environ["WHISPER_PROVIDER"] = "local_api"
os.environ["WHISPER_API_URL"] = "http://dummy-local-api:8000/v1/audio/transcriptions"

# テスト対象アプリのインポート
from app.main import app

client = TestClient(app)


def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    res_json = response.json()
    assert res_json["status"] == "ok"
    assert res_json["provider"] == "local_api"


@patch("requests.post")
def test_invoke_local_api_success(mock_post):
    # 外出しAPIの中継レスポンスをモック
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {"text": "テスト書き起こし"}
    mock_post.return_value = mock_response

    # ダミー音声をbase64エンコード
    audio_base64 = base64.b64encode(b"dummy_audio_bytes").decode("utf-8")
    
    payload = {
        "inputs": {
            "files": [
                {
                    "files": [
                        {
                            "filename": "test.wav",
                            "content": audio_base64
                        }
                    ]
                }
            ],
            "language": "ja"
        }
    }
    
    headers = {"x-api-key": "test-key"}
    response = client.post("/invoke", json=payload, headers=headers)
    
    assert response.status_code == 200
    assert "テスト書き起こし" in response.json()["outputs"]
    assert "ローカルAPI" in response.json()["outputs"]

    # requests.postが期待通りに呼ばれたことを検証
    mock_post.assert_called_once()
    args, kwargs = mock_post.call_args
    assert args[0] == "http://dummy-local-api:8000/v1/audio/transcriptions"
    assert "file" in kwargs["files"]
    assert kwargs["data"]["language"] == "ja"


def test_allow_cloud_api_guard_prevents_litellm_and_forces_local(monkeypatch):
    # ALLOW_CLOUD_API=False で WHISPER_PROVIDER=litellm (外部クラウドモデル) の場合
    import app.main
    monkeypatch.setattr(app.main, "ALLOW_CLOUD_API", False)
    monkeypatch.setattr(app.main, "WHISPER_PROVIDER", "litellm")
    monkeypatch.setattr(app.main, "LITELLM_AUDIO_MODEL", "whisper-cloud") # クラウドモデル
    
    response = client.get("/health")
    assert response.status_code == 200
    # ガードにより強制的に local にフォールバックされることを期待
    assert response.json()["provider"] == "local"


def test_guardrail_allows_local_litellm_target(monkeypatch):
    # ALLOW_CLOUD_API=False でも、宛先がローカルかつモデルが whisper-local なら許可
    import app.main
    monkeypatch.setattr(app.main, "ALLOW_CLOUD_API", False)
    monkeypatch.setattr(app.main, "WHISPER_PROVIDER", "litellm")
    monkeypatch.setattr(app.main, "LITELLM_AUDIO_URL", "http://litellm:4000/v1")
    monkeypatch.setattr(app.main, "LITELLM_AUDIO_MODEL", "whisper-local")
    
    response = client.get("/health")
    assert response.status_code == 200
    # ガードレールをバイパスして litellm が維持されることを期待
    assert response.json()["provider"] == "litellm"

