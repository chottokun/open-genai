from __future__ import annotations

import os
from unittest.mock import MagicMock, patch
import pytest
from conftest import load_service_module

# image_gen モジュールを読み込み
image_gen = load_service_module("backend/app/image_gen.py")


def test_build_a1111_payload_text_to_image() -> None:
    payload = image_gen.build_a1111_payload(
        {
            "textPrompt": [
                {"text": "a cat", "weight": 1},
                {"text": "blurry", "weight": -1},
            ],
            "width": 512,
            "height": 768,
            "step": 25,
            "cfgScale": 8,
            "seed": 42,
            "stylePreset": "anime",
        }
    )
    assert payload["prompt"] == "a cat, anime style"
    assert payload["negative_prompt"] == "blurry"
    assert payload["width"] == 512
    assert payload["height"] == 768
    assert payload["steps"] == 25
    assert payload["cfg_scale"] == 8
    assert payload["seed"] == 42
    assert "init_images" not in payload


def test_build_a1111_payload_image_to_image() -> None:
    payload = image_gen.build_a1111_payload(
        {
            "textPrompt": [{"text": "a dog", "weight": 1}],
            "width": 512,
            "height": 512,
            "step": 20,
            "cfgScale": 7,
            "seed": 1,
            "initImage": "abc123",
            "imageStrength": 0.4,
        }
    )
    assert payload["init_images"] == ["abc123"]
    assert payload["denoising_strength"] == 0.4


def test_build_a1111_payload_requires_prompt() -> None:
    try:
        image_gen.build_a1111_payload({"textPrompt": []})
    except ValueError as exc:
        assert "プロンプト" in str(exc)
    else:
        raise AssertionError("expected ValueError")


@pytest.mark.asyncio
@patch("httpx.AsyncClient.get")
async def test_is_sd_up_local_success(mock_get, monkeypatch) -> None:
    mock_res = MagicMock()
    mock_res.status_code = 200
    async def mock_get_coro(*args, **kwargs):
        return mock_res
    mock_get.side_effect = mock_get_coro

    monkeypatch.setattr(image_gen, "IMAGE_PROVIDER", "local")
    up = await image_gen.is_sd_up()
    assert up is True


@pytest.mark.asyncio
@patch("httpx.AsyncClient.get")
async def test_is_sd_up_local_failure(mock_get, monkeypatch) -> None:
    async def mock_get_coro(*args, **kwargs):
        import httpx
        raise httpx.ConnectError("Connection refused")
    mock_get.side_effect = mock_get_coro

    monkeypatch.setattr(image_gen, "IMAGE_PROVIDER", "local")
    up = await image_gen.is_sd_up()
    assert up is False


@pytest.mark.asyncio
@patch("httpx.AsyncClient.get")
async def test_is_sd_up_litellm_success(mock_get, monkeypatch) -> None:
    mock_res = MagicMock()
    mock_res.status_code = 200
    async def mock_get_coro(*args, **kwargs):
        return mock_res
    mock_get.side_effect = mock_get_coro

    monkeypatch.setattr(image_gen, "IMAGE_PROVIDER", "litellm")
    up = await image_gen.is_sd_up()
    assert up is True


@pytest.mark.asyncio
@patch("httpx.AsyncClient.get")
async def test_is_sd_up_local_api_success(mock_get, monkeypatch) -> None:
    mock_res = MagicMock()
    mock_res.status_code = 200
    async def mock_get_coro(*args, **kwargs):
        return mock_res
    mock_get.side_effect = mock_get_coro

    monkeypatch.setattr(image_gen, "IMAGE_PROVIDER", "local_api")
    up = await image_gen.is_sd_up()
    assert up is True


@pytest.mark.asyncio
@patch("httpx.AsyncClient.post")
async def test_generate_image_base64_local_success(mock_post, monkeypatch) -> None:
    mock_res = MagicMock()
    mock_res.status_code = 200
    mock_res.json.return_value = {"images": ["data:image/png;base64,dummy_local_png"]}
    async def mock_post_coro(*args, **kwargs):
        return mock_res
    mock_post.side_effect = mock_post_coro

    monkeypatch.setattr(image_gen, "IMAGE_PROVIDER", "local")
    b64 = await image_gen.generate_image_base64(
        {"textPrompt": [{"text": "a cat", "weight": 1}]}
    )
    assert b64 == "dummy_local_png"


@pytest.mark.asyncio
@patch("httpx.AsyncClient.post")
async def test_generate_image_base64_local_api_success(mock_post, monkeypatch) -> None:
    mock_res = MagicMock()
    mock_res.status_code = 200
    mock_res.json.return_value = {"data": [{"b64_json": "dummy_local_api_png"}]}
    async def mock_post_coro(*args, **kwargs):
        return mock_res
    mock_post.side_effect = mock_post_coro

    monkeypatch.setattr(image_gen, "IMAGE_PROVIDER", "local_api")
    b64 = await image_gen.generate_image_base64(
        {"textPrompt": [{"text": "a cat", "weight": 1}]}
    )
    assert b64 == "dummy_local_api_png"


@pytest.mark.asyncio
@patch("httpx.AsyncClient.post")
async def test_generate_image_base64_litellm_success(mock_post, monkeypatch) -> None:
    mock_res = MagicMock()
    mock_res.status_code = 200
    mock_res.json.return_value = {"data": [{"b64_json": "dummy_litellm_png"}]}
    async def mock_post_coro(*args, **kwargs):
        return mock_res
    mock_post.side_effect = mock_post_coro

    monkeypatch.setattr(image_gen, "IMAGE_PROVIDER", "litellm")
    b64 = await image_gen.generate_image_base64(
        {"textPrompt": [{"text": "a cat", "weight": 1}]}
    )
    assert b64 == "dummy_litellm_png"


def test_get_effective_provider_guardrail(monkeypatch) -> None:
    monkeypatch.setattr(image_gen, "ALLOW_CLOUD_API", False)
    monkeypatch.setattr(image_gen, "IMAGE_PROVIDER", "litellm")

    # 宛先がローカルではない（外部クラウド）場合は local にフォールバック
    monkeypatch.setattr(image_gen, "LITELLM_IMAGE_URL", "https://api.openai.com/v1")
    prov = image_gen.get_effective_provider()
    assert prov == "local"

    # 宛先がローカル（docker内部やlocalhost等）の場合は litellm のまま
    monkeypatch.setattr(image_gen, "LITELLM_IMAGE_URL", "http://litellm:4000/v1")
    prov = image_gen.get_effective_provider()
    assert prov == "litellm"
