import os
import tempfile
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app import auth

# 一時ディレクトリをFILES_DIRに設定してテストする
@pytest.fixture(autouse=True)
def setup_files_dir(monkeypatch):
    with tempfile.TemporaryDirectory() as tmpdir:
        monkeypatch.setenv("FILES_DIR", tmpdir)
        import app.main
        monkeypatch.setattr(app.main, "FILES_DIR", tmpdir)
        yield tmpdir

client = TestClient(app)

def test_safe_path():
    from app.main import _safe_path
    
    # 正常ケース
    path = _safe_path("uuid1/test.txt")
    assert path.endswith("uuid1/test.txt")
    
    # パストラバーサル (ValueError)
    with pytest.raises(ValueError, match="invalid path"):
        _safe_path("../test.txt")
        
    with pytest.raises(ValueError, match="invalid path"):
        _safe_path("/absolute/path/test.txt")
        
    with pytest.raises(ValueError, match="invalid path"):
        _safe_path("uuid1/../../test.txt")

    # Windowsパス区切り文字を使用したトラバーサル
    with pytest.raises(ValueError, match="invalid path"):
        _safe_path("uuid1\\..\\..\\test.txt")

    # NULLバイトを含むパス
    with pytest.raises(ValueError, match="invalid path"):
        _safe_path("uuid1/test.txt\x00")

def test_file_token_mint_and_verify():
    # トークン生成
    token = auth.mint_file_token("uuid1/test.txt", sub="file_upload", ttl_seconds=60)
    
    # トークン検証
    payload = auth.verify_token(token)
    assert payload["sub"] == "file_upload"
    assert payload["path"] == "uuid1/test.txt"
    assert "exp" in payload
    
    # 不正なトークン
    with pytest.raises(Exception):
        auth.verify_token("invalid-token")

def test_put_and_get_file_with_token():
    key = "uuid1/test.txt"
    content = b"Hello, World!"
    
    # トークンなしでのPUT -> 401
    response = client.put(f"/files/{key}", content=content)
    assert response.status_code == 401
    
    # 不正なトークンでのPUT -> 401 (verify_tokenの失敗は401)
    response = client.put(f"/files/{key}?token=invalid-token", content=content)
    assert response.status_code == 401
    
    # 正しいアップロード用トークンでPUT -> 200
    upload_token = auth.mint_file_token(key, sub="file_upload", ttl_seconds=60)
    response = client.put(f"/files/{key}?token={upload_token}", content=content)
    assert response.status_code == 200
    
    # トークンなしでのGET -> 401
    response = client.get(f"/files/{key}")
    assert response.status_code == 401
    
    # アップロード用トークンでGET -> 403 (sub不一致)
    response = client.get(f"/files/{key}?token={upload_token}")
    assert response.status_code == 403
    
    # 正しいダウンロード用トークンでGET -> 200
    download_token = auth.mint_file_token(key, sub="file_access", ttl_seconds=60)
    response = client.get(f"/files/{key}?token={download_token}")
    assert response.status_code == 200
    assert response.content == content

from unittest.mock import patch

def test_exapp_config_validation():
    # 管理者権限のトークンを作成
    token = auth.mint_token(
        sub="admin-user",
        email="admin@example.com",
        name="Admin User",
        groups=["SystemAdminGroup"]
    )
    headers = {"Authorization": f"Bearer {token}"}
    
    # teams_store.get_exapp をモック
    # 不正な JSON の config_raw を返すようにする
    bad_app_def = {
        "teamId": "test-team",
        "exAppId": "test-app",
        "endpoint": "http://example.com/api",
        "config": "{invalid_json: 123"  # 不正なJSON
    }
    
    with patch("app.teams_store.get_exapp", return_value=bad_app_def):
        payload = {
            "teamId": "test-team",
            "exAppId": "test-app",
            "inputs": {}
        }
        response = client.post("/exapps/invoke", json=payload, headers=headers)
        assert response.status_code == 400
        assert "AI アプリの設定(config)が不正な JSON 形式です" in response.json()["error"]
        
    # get_exapp_schema に対するテストも行う
    with patch("app.teams_store.get_exapp", return_value=bad_app_def):
        payload = {
            "teamId": "test-team",
            "exAppId": "test-app"
        }
        response = client.post("/exapps/schema", json=payload, headers=headers)
        assert response.status_code == 400
        assert "AI アプリの設定(config)が不正な JSON 形式です" in response.json()["error"]


