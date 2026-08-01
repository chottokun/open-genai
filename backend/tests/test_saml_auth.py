"""SAML 認証のヘッダ解析、設定キャッシュ、例外ハンドリングのテスト"""
import pytest
from unittest.mock import MagicMock, AsyncMock, patch
from fastapi import Request
from starlette.datastructures import Headers, QueryParams

from app import auth
from app.main import _prepare_saml_request, auth_acs


def test_saml_settings_allow_repeat_attribute_name():
    """Keycloak 等からの重複 Attribute 名を許容する設定になっているか確認"""
    auth.reset_settings_cache()
    fake_idp = {"idp": {"entityId": "http://idp.example.com", "singleSignOnService": {"url": "http://idp.example.com/sso"}}}
    with patch("app.auth.OneLogin_Saml2_IdPMetadataParser.parse_remote", return_value=fake_idp):
        settings = auth.get_saml_settings()
        assert settings["security"]["allowRepeatAttributeName"] is True


@pytest.mark.asyncio
async def test_prepare_saml_request_forwarded_headers(monkeypatch):
    """X-Forwarded-* ヘッダが指定された場合に正しいポート・ホスト・プロトコルがパースされるか検証"""
    monkeypatch.delenv("PUBLIC_URL", raising=False)
    mock_request = MagicMock(spec=Request)
    mock_request.method = "GET"
    mock_request.url.scheme = "http"
    mock_request.url.path = "/api/auth/saml/acs"
    mock_request.query_params = QueryParams()
    mock_request.headers = Headers({
        "x-forwarded-proto": "https",
        "x-forwarded-host": "your-domain.local",
        "x-forwarded-port": "443",
        "x-forwarded-prefix": "/api",
    })

    req = await _prepare_saml_request(mock_request)
    assert req["https"] == "on"
    assert req["http_host"] == "your-domain.local"
    assert req["server_port"] == "443"
    assert req["script_name"] == "/api/auth/saml/acs"


@pytest.mark.asyncio
async def test_prepare_saml_request_defaults_without_forwarded_headers(monkeypatch):
    """X-Forwarded-* が無い場合のデフォルト動作（http 80 / https 443 判定）の検証"""
    monkeypatch.delenv("PUBLIC_URL", raising=False)
    # 1. HTTP デフォルト
    mock_http = MagicMock(spec=Request)
    mock_http.method = "GET"
    mock_http.url.scheme = "http"
    mock_http.url.path = "/auth/saml/acs"
    mock_http.query_params = QueryParams()
    mock_http.headers = Headers({"host": "localhost"})

    req_http = await _prepare_saml_request(mock_http)
    assert req_http["https"] == "off"
    assert req_http["server_port"] == "80"

    # 2. HTTPS デフォルト
    mock_https = MagicMock(spec=Request)
    mock_https.method = "GET"
    mock_https.url.scheme = "https"
    mock_https.url.path = "/auth/saml/acs"
    mock_https.query_params = QueryParams()
    mock_https.headers = Headers({"host": "localhost"})

    req_https = await _prepare_saml_request(mock_https)
    assert req_https["https"] == "on"
    assert req_https["server_port"] == "443"


@pytest.mark.asyncio
async def test_auth_acs_handles_saml_exception():
    """saml_auth.process_response() が例外を発行した場合、303 で auth-error にリダイレクトされキャッシュがリセットされるか"""
    mock_request = MagicMock(spec=Request)
    mock_request.method = "POST"
    mock_request.form = AsyncMock(return_value={"RelayState": ""})
    mock_request.headers = Headers({})
    mock_request.query_params = QueryParams()
    mock_request.url.scheme = "http"
    mock_request.url.path = "/auth/saml/acs"

    with patch("app.main.auth.build_saml_auth") as mock_build_saml:
        mock_saml_inst = MagicMock()
        mock_saml_inst.process_response.side_effect = Exception("SAML Invalid Signature Exception Test")
        mock_build_saml.return_value = mock_saml_inst

        with patch("app.main.audit.record") as mock_audit:
            response = await auth_acs(mock_request)

            assert response.status_code == 303
            assert response.headers["location"].endswith("/auth-error")
            mock_audit.assert_called_once()
            assert mock_audit.call_args[1]["status"] == 401


@pytest.mark.asyncio
async def test_auth_sls_post_and_get():
    """/auth/saml/sls エンドポイントが GET および POST の双方を受領できることを検証"""
    from app.main import auth_sls
    for method in ("GET", "POST"):
        mock_req = MagicMock(spec=Request)
        mock_req.method = method
        mock_req.form = AsyncMock(return_value={})
        mock_req.headers = Headers({})
        mock_req.query_params = QueryParams()
        mock_req.url.scheme = "http"
        mock_req.url.path = "/auth/saml/sls"

        with patch("app.main.auth.build_saml_auth") as mock_build_saml:
            mock_saml_inst = MagicMock()
            mock_build_saml.return_value = mock_saml_inst

            response = await auth_sls(mock_req)
            assert response.status_code == 303
            assert response.headers["location"].endswith("/signed-out")

