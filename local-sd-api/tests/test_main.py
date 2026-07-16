import sys
from unittest.mock import MagicMock, AsyncMock

# ローカル環境に diffusers (および torch) がない場合のための sys.modules モック
mock_diffusers = MagicMock()
sys.modules["diffusers"] = mock_diffusers
sys.modules["torch"] = MagicMock()

import os  # noqa: E402
from unittest.mock import patch  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

# テスト前に環境変数をモック設定
os.environ["IMAGE_INFERENCE_DEVICE"] = "cpu"
os.environ["IMAGE_MODEL_NAME"] = "dummy-sd-model"
os.environ["SD_USE_PROXY"] = "false"  # デフォルトはローカル動作テスト

# appのインポート
from app.main import app  # noqa: E402
import app.main as main  # noqa: E402

client = TestClient(app)


def test_health():
    main.USE_PROXY = False
    response = client.get("/health")
    assert response.status_code == 200
    res_json = response.json()
    assert res_json["status"] == "ok"
    assert res_json["model"] == "dummy-sd-model"


@patch("app.main.pipe")
def test_generate_image_success(mock_pipe):
    main.USE_PROXY = False
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
    main.USE_PROXY = False
    # プロンプトなしの場合は 422 エラーになることをテスト
    response = client.post("/v1/images/generations", json={})
    assert response.status_code == 422


def test_generate_image_proxy_mode():
    main.USE_PROXY = True
    try:
        # Mockのレスポンス定義
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "data": [{"b64_json": "proxy_b64_data"}]
        }
        
        # httpxの非同期クライアントをモック化
        mock_client = MagicMock()
        mock_client.__aenter__.return_value = mock_client
        # 非同期 post メソッドを AsyncMock でバインド
        mock_client.post = AsyncMock(return_value=mock_response)
        
        with patch("httpx.AsyncClient", return_value=mock_client):
            payload = {
                "prompt": "a futuristic city",
                "size": "512x512",
                "n": 1
            }
            response = client.post("/v1/images/generations", json=payload)
            assert response.status_code == 200
            res_json = response.json()
            assert "data" in res_json
            assert res_json["data"][0]["b64_json"] == "proxy_b64_data"
            mock_client.post.assert_called_once()
    finally:
        main.USE_PROXY = False


def test_health_proxy_mode():
    main.USE_PROXY = True
    try:
        response = client.get("/health")
        assert response.status_code == 200
        res_json = response.json()
        assert res_json["status"] == "ok"
        assert res_json["mode"] == "proxy"
        assert "upstream" in res_json
    finally:
        main.USE_PROXY = False


