from __future__ import annotations

import os
import base64
import asyncio
from unittest.mock import AsyncMock, MagicMock
import pytest
from conftest import load_service_module

# image_gen モジュールを読み込み
image_gen = load_service_module("backend/app/image_gen.py")


def test_positive_negative_prompts() -> None:
    positive, negative = image_gen._positive_negative_prompts(
        [
            {"text": "a cute kitten", "weight": 1},
            {"text": "blurry, low quality", "weight": -1},
        ]
    )
    assert positive == "a cute kitten"
    assert negative == "blurry, low quality"


def test_apply_style_preset() -> None:
    p = image_gen._apply_style_preset("a castle", "anime")
    assert p == "a castle, anime style"

    p2 = image_gen._apply_style_preset("a castle", None)
    assert p2 == "a castle"


@pytest.mark.asyncio
async def test_is_sd_up_success(monkeypatch) -> None:
    mock_res = MagicMock()
    mock_res.status_code = 200

    class MockClient:
        async def __aenter__(self):
            return self
        async def __aexit__(self, exc_type, exc_val, exc_tb):
            pass
        async def get(self, *args, **kwargs):
            return mock_res

    monkeypatch.setattr("httpx.AsyncClient", lambda *args, **kwargs: MockClient())

    up = await image_gen.is_sd_up()
    assert up is True


@pytest.mark.asyncio
async def test_is_sd_up_failure(monkeypatch) -> None:
    class MockClient:
        async def __aenter__(self):
            return self
        async def __aexit__(self, exc_type, exc_val, exc_tb):
            pass
        async def get(self, *args, **kwargs):
            import httpx
            raise httpx.ConnectError("Connection refused")

    monkeypatch.setattr("httpx.AsyncClient", lambda *args, **kwargs: MockClient())

    up = await image_gen.is_sd_up()
    assert up is False


@pytest.mark.asyncio
async def test_generate_image_base64_success(monkeypatch) -> None:
    mock_client = MagicMock()
    mock_images = MagicMock()
    mock_response = MagicMock()
    mock_data = MagicMock()
    mock_data.b64_json = "dummy_base64_image_data"
    mock_response.data = [mock_data]

    mock_images.generate = AsyncMock(return_value=mock_response)
    mock_client.images = mock_images

    monkeypatch.setattr(image_gen, "get_openai_client", lambda: mock_client)

    params = {
        "textPrompt": [{"text": "a cute shiba inu", "weight": 1}],
        "quality": "hd",
        "style": "vivid",
        "extra_body": {"style_id": "recraft-v3-art"},
    }

    b64 = await image_gen.generate_image_base64(params, model_id="recraft-v3")
    assert b64 == "dummy_base64_image_data"

    # 呼び出しパラメータの検証
    mock_images.generate.assert_called_once()
    called_kwargs = mock_images.generate.call_args[1]
    assert called_kwargs["model"] == "recraft-v3"
    assert called_kwargs["prompt"] == "a cute shiba inu"
    assert called_kwargs["quality"] == "hd"
    assert called_kwargs["style"] == "vivid"
    assert called_kwargs["extra_body"] == {"style_id": "recraft-v3-art"}


@pytest.mark.asyncio
async def test_edit_image_base64_success(monkeypatch) -> None:
    mock_client = MagicMock()
    mock_images = MagicMock()
    mock_response = MagicMock()
    mock_data = MagicMock()
    mock_data.b64_json = "dummy_edited_base64"
    mock_response.data = [mock_data]

    mock_images.edit = AsyncMock(return_value=mock_response)
    mock_client.images = mock_images

    monkeypatch.setattr(image_gen, "get_openai_client", lambda: mock_client)

    b64 = await image_gen.edit_image_base64(
        image_bytes=b"img_bytes",
        mask_bytes=b"mask_bytes",
        prompt="inpainting cat",
        model_id="gpt-image-1"
    )
    assert b64 == "dummy_edited_base64"

    mock_images.edit.assert_called_once()
    called_kwargs = mock_images.edit.call_args[1]
    assert called_kwargs["model"] == "gpt-image-1"
    assert called_kwargs["image"] == ("image.png", b"img_bytes", "image/png")
    assert called_kwargs["mask"] == ("mask.png", b"mask_bytes", "image/png")
    assert called_kwargs["prompt"] == "inpainting cat"


def test_save_generated_image(tmp_path, monkeypatch) -> None:
    # 一時保存先を設定
    test_dir = str(tmp_path / "generations")
    os.makedirs(test_dir, exist_ok=True)

    monkeypatch.setattr(image_gen, "STATIC_GENERATIONS_DIR", test_dir)

    dummy_b64 = base64.b64encode(b"fake-png-data").decode("utf-8")

    # 保存実行
    url_path = image_gen.save_generated_image(dummy_b64)
    assert url_path.startswith("/static/generations/img_")
    assert url_path.endswith(".png")

    filename = os.path.basename(url_path)
    saved_file = os.path.join(test_dir, filename)
    assert os.path.isfile(saved_file)

    with open(saved_file, "rb") as f:
        assert f.read() == b"fake-png-data"


def test_get_effective_provider() -> None:
    assert image_gen.get_effective_provider() == "litellm"
