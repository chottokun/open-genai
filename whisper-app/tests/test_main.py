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
    # ALLOW_CLOUD_API=False で WHISPER_PROVIDER=litellm を指定した場合
    monkeypatch.setenv("ALLOW_CLOUD_API", "false")
    monkeypatch.setenv("WHISPER_PROVIDER", "litellm")
    
    # 動的にモジュールを再インポートせずとも、設定値の再評価ロジックが働くか検証するため、
    # アプリの初期化時点の WHISPER_PROVIDER を変更
    import app.main
    monkeypatch.setattr(app.main, "ALLOW_CLOUD_API", False)
    monkeypatch.setattr(app.main, "WHISPER_PROVIDER", "litellm")
    
    # ガードレール再評価ロジックが走り、localにフォールバックされるか検証
    # (invoke時またはhealth時にPROVIDERがlocalにフォールバックされる処理)
    # ここでは /health 経由で provider が local になっているかテスト
    response = client.get("/health")
    assert response.status_code == 200
    # ガードにより強制的に local に変更されることを期待
    # (実装時に app.main の起動処理やリクエスト処理でフォールバックロジックを入れます)
    assert response.json()["provider"] == "local"
