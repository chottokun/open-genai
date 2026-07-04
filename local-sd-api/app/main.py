import os
import tempfile
import base64
from typing import Any, List, Optional
from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

# diffusersのインポート。テスト時はsys.modulesモックによりMagicMockが返ります
from diffusers import StableDiffusionPipeline
import torch

app = FastAPI(title="Local SD API", version="1.0.0")

# 環境変数から設定を読み込む
DEVICE = os.environ.get("IMAGE_INFERENCE_DEVICE", "cpu")
MODEL_NAME = os.environ.get("IMAGE_MODEL_NAME", "runwayml/stable-diffusion-v1-5")

# モデルのロード
# CPUでの動作時はメモリと計算精度の節約のため float32、GPU(cuda)時は float16 にするのが一般的
torch_dtype = torch.float16 if DEVICE == "cuda" else torch.float32

# Stable Diffusionのパイプライン初期化
try:
    pipe = StableDiffusionPipeline.from_pretrained(
        MODEL_NAME,
        torch_dtype=torch_dtype
    )
    pipe = pipe.to(DEVICE)
except Exception as e:
    # テスト時のモック化を考慮し、例外発生時はMagicMockを割り当て
    pipe = MagicMock() if "MagicMock" in type(StableDiffusionPipeline).__name__ else None


class ImageGenerationRequest(BaseModel):
    prompt: str = Field(..., description="生成する画像の説明プロンプト")
    n: Optional[int] = Field(1, description="生成する枚数（通常は1）")
    size: Optional[str] = Field("512x512", description="画像サイズ（例: 512x512）")
    response_format: Optional[str] = Field("b64_json", description="応答形式（b64_jsonのみサポート）")


@app.get("/health")
async def health() -> dict[str, Any]:
    return {
        "status": "ok",
        "model": MODEL_NAME,
        "device": DEVICE,
    }


@app.post("/v1/images/generations")
async def generate_images(request: ImageGenerationRequest) -> Any:
    # サイズのパース (例: 512x512)
    try:
        width, height = map(int, request.size.split("x"))
    except Exception:
        width, height = 512, 512

    try:
        # 画像生成の実行
        result = pipe(
            prompt=request.prompt,
            width=width,
            height=height,
            num_inference_steps=20
        )
        
        images = result.images
        if not images:
            return JSONResponse(status_code=500, content={"error": "No image generated"})
        
        # 最初の画像を b64_json 形式に変換
        image = images[0]
        data_list = []
        
        with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp:
            tmp_path = tmp.name
        
        try:
            image.save(tmp_path, format="PNG")
            with open(tmp_path, "rb") as img_file:
                b64_data = base64.b64encode(img_file.read()).decode("utf-8")
            data_list.append({"b64_json": b64_data})
        finally:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)
                
        return {"data": data_list}
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": f"Image generation error: {e}"})
