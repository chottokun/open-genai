import os
from unittest.mock import MagicMock, patch
import pytest
from fastapi.testclient import TestClient

# モック環境変数の定義
os.environ["RAG_API_KEY"] = "test-key"
os.environ["ALLOW_CLOUD_API"] = "false"
os.environ["IMAGE_PROVIDER"] = "local_api"
os.environ["IMAGE_API_URL"] = "http://dummy-local-sd-api:8000/v1/images/generations"

# テスト対象アプリのインポート
from app.main import app

client = TestClient(app)


@patch("httpx.AsyncClient.get")
def test_health_local_api(mock_get):
    # healthの戻り値を確認するため
    # IMAGE_PROVIDER = local_api
    mock_response = MagicMock()
    mock_response.status_code = 200
    
    async def mock_get_coro(*args, **kwargs):
        return mock_response
    mock_get.side_effect = mock_get_coro

    response = client.get("/health")
    assert response.status_code == 200
    res_json = response.json()
    assert res_json["status"] == "ok"
    assert res_json["provider"] == "local_api"


@patch("httpx.AsyncClient.post")
def test_invoke_local_api_success(mock_post):
    # 外出しAPIの中継レスポンスをモック
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {"data": [{"b64_json": "dummy_b64_png"}]}
    
    # AsyncClient.postの非同期の戻り値をモック化
    async def mock_post_coro(*args, **kwargs):
        return mock_response
    mock_post.side_effect = mock_post_coro

    payload = {
        "inputs": {
            "prompt": "a beautiful forest",
            "size": "512",
            "steps": "20"
        }
    }
    
    headers = {"x-api-key": "test-key"}
    response = client.post("/invoke", json=payload, headers=headers)
    
    assert response.status_code == 200
    res_json = response.json()
    assert "artifacts" in res_json
    assert len(res_json["artifacts"]) == 1
    assert res_json["artifacts"][0]["content"] == "dummy_b64_png"
    assert "画像生成(ローカルAPI)" in res_json["outputs"]

    # 宛先URLが正しいことを検証
    mock_post.assert_called_once()
    args, kwargs = mock_post.call_args
    assert args[0] == "http://dummy-local-sd-api:8000/v1/images/generations"


def test_allow_cloud_api_guard_prevents_litellm_and_forces_local(monkeypatch):
    # ALLOW_CLOUD_API=False で IMAGE_PROVIDER=litellm を指定した場合
    import app.main
    monkeypatch.setattr(app.main, "ALLOW_CLOUD_API", False)
    monkeypatch.setattr(app.main, "IMAGE_PROVIDER", "litellm")
    
    # A1111ヘルスチェックをモック（503回避）
    mock_get = MagicMock()
    mock_get.status_code = 200
    
    async def mock_get_coro(*args, **kwargs):
        return mock_get
        
    with patch("httpx.AsyncClient.get", side_effect=mock_get_coro):
        response = client.get("/health")
        assert response.status_code == 200
        # ガードにより強制的に local に変更されることを期待
        assert response.json()["provider"] == "local"
