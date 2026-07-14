from __future__ import annotations

from pydantic import BaseModel, Field
from typing import Any, List, Optional

class RagInvokeInputs(BaseModel):
    action: str = Field(default="ask", description="実行するアクション")
    question: Optional[str] = Field(default=None, description="質問内容")
    top_k: int = Field(default=4, description="参照件数")
    tags: Optional[Any] = Field(default=None, description="絞り込みタグ")
    url: Optional[str] = Field(default=None, description="対象URL")
    document: Optional[str] = Field(default=None, description="対象ドキュメント名")
    files: Optional[List[Any]] = Field(default=None, description="アップロードされたファイル情報")

class RagInvokeRequest(BaseModel):
    inputs: RagInvokeInputs
