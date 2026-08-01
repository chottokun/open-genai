from __future__ import annotations

import os
import asyncio
from unittest.mock import MagicMock, patch
import pytest
from conftest import load_service_module

# image_gen モジュールを読み込み
image_gen = load_service_module("backend/app/image_gen.py")


@patch("httpx.AsyncClient.get")
def test_is_sd_up_litellm_success(mock_get, monkeypatch) -> None:
    mock_res = MagicMock()
    mock_res.status_code = 200
    async def mock_get_coro(*args, **kwargs):
        return mock_res
    mock_get.side_effect = mock_get_coro

    monkeypatch.setattr(image_gen, "ALLOW_CLOUD_API", True)
    up = asyncio.run(image_gen.is_sd_up())
    assert up is True


def test_get_effective_provider_guardrail_litellm(monkeypatch) -> None:
    monkeypatch.setattr(image_gen, "ALLOW_CLOUD_API", False)

    # 宛先がローカルではない（外部クラウド）場合は例外発生
    monkeypatch.setattr(image_gen, "LITELLM_IMAGE_URL", "https://api.openai.com/v1")
    with pytest.raises(RuntimeError, match="外部クラウド画像生成APIの利用が制限されています"):
        image_gen.get_effective_provider()

    # 宛先がローカル（docker内部やlocalhost等）の場合は litellm のまま
    monkeypatch.setattr(image_gen, "LITELLM_IMAGE_URL", "http://litellm:4000/v1")
    prov = image_gen.get_effective_provider()
    assert prov == "litellm"


@patch("httpx.AsyncClient.post")
def test_generate_image_base64_dict_litellm_success(mock_post, monkeypatch) -> None:
    mock_res = MagicMock()
    mock_res.status_code = 200
    mock_res.json.return_value = {"data": [{"b64_json": "dummy_litellm_png"}]}
    async def mock_post_coro(*args, **kwargs):
        return mock_res
    mock_post.side_effect = mock_post_coro

    monkeypatch.setattr(image_gen, "LITELLM_IMAGE_URL", "http://litellm:4000/v1")
    monkeypatch.setattr(image_gen, "ALLOW_CLOUD_API", True)

    res = asyncio.run(image_gen.generate_image_base64_dict(
        {"textPrompt": [{"text": "a cat", "weight": 1}]}
    ))
    assert res["data"][0]["b64_json"] == "dummy_litellm_png"


@patch("httpx.AsyncClient.post")
def test_generate_image_base64_dict_litellm_dynamic_model_id_success(mock_post, monkeypatch) -> None:
    # 引数 model_id が渡されたとき、LITELLM_IMAGE_MODELよりも優先してLiteLLMに転送されることをテスト
    mock_res = MagicMock()
    mock_res.status_code = 200
    mock_res.json.return_value = {"data": [{"b64_json": "dummy_dynamic_png"}]}

    captured_payload = {}
    async def mock_post_coro(url, json, headers, *args, **kwargs):
        nonlocal captured_payload
        captured_payload = json
        return mock_res
    mock_post.side_effect = mock_post_coro

    monkeypatch.setattr(image_gen, "LITELLM_IMAGE_URL", "http://litellm:4000/v1")
    monkeypatch.setattr(image_gen, "ALLOW_CLOUD_API", True)
    monkeypatch.setattr(image_gen, "LITELLM_IMAGE_MODEL", "imagen-4") # デフォルト

    res = asyncio.run(image_gen.generate_image_base64_dict(
        {"textPrompt": [{"text": "A cyber city", "weight": 1}]},
        model_id="gpt-image-1" # 画面で選択されたモデルID
    ))

    assert res["data"][0]["b64_json"] == "dummy_dynamic_png"
    assert captured_payload["model"] == "gpt-image-1"
