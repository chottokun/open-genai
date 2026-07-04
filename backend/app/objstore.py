"""オブジェクトストレージ（S3 互換）連携。

OpenGENAI の思想（マネージドサービスを使わない）に合わせ、自前ホストの
**OSS S3 互換サーバ（SeaweedFS 等）** に成果物を保存し、**署名付き URL**で
利用者へ受け渡す。接続先は S3 API（boto3）で抽象化しており、SeaweedFS /
MinIO / その他 S3 互換に `endpoint_url` を向けるだけで差し替え可能。

配信経路の都合上、内部アップロード用エンドポイント（`S3_ENDPOINT_URL`）と、
利用者がアクセスする公開エンドポイント（`S3_PUBLIC_ENDPOINT`）を分離できる。

未設定時・boto3 不在時は無効（`is_configured()` が False）としてフォールバック。
"""

from __future__ import annotations

import os
import re
import uuid
from typing import Any

S3_ENDPOINT_URL = os.environ.get("S3_ENDPOINT_URL", "").rstrip("/")
# 署名付き URL 生成に使う公開エンドポイント（未指定なら内部と同じ）
S3_PUBLIC_ENDPOINT = (os.environ.get("S3_PUBLIC_ENDPOINT") or S3_ENDPOINT_URL).rstrip("/")
S3_REGION = os.environ.get("S3_REGION", "us-east-1")
S3_BUCKET = os.environ.get("S3_BUCKET", "")
S3_ACCESS_KEY = os.environ.get("S3_ACCESS_KEY", "")
S3_SECRET_KEY = os.environ.get("S3_SECRET_KEY", "")
# 署名付き URL の有効期限（秒）。既定 24 時間。
S3_PRESIGN_EXPIRY = int(os.environ.get("S3_PRESIGN_EXPIRY", str(24 * 3600)))
# SeaweedFS / MinIO は path-style が無難
S3_ADDRESSING_STYLE = os.environ.get("S3_ADDRESSING_STYLE", "path")
S3_KEY_PREFIX = os.environ.get("S3_KEY_PREFIX", "exapp")


def is_configured() -> bool:
    return bool(S3_ENDPOINT_URL and S3_BUCKET and S3_ACCESS_KEY and S3_SECRET_KEY)


_SAFE_RE = re.compile(r"[^A-Za-z0-9._\-]+")


def sanitize_filename(name: str | None) -> str:
    """キー/表示に安全なファイル名へ整える。"""
    base = (name or "").strip().replace("\\", "/").split("/")[-1]
    base = _SAFE_RE.sub("_", base).strip("._-")
    return base or "file"


def _safe_segment(value: str | None) -> str:
    seg = _SAFE_RE.sub("_", (value or "").strip())
    return seg.strip("._-") or "anon"


def build_key(user_id: str | None, filename: str | None) -> str:
    """`<prefix>/<user>/<uuid>/<filename>` のオブジェクトキーを作る。"""
    return "/".join(
        [
            S3_KEY_PREFIX,
            _safe_segment(user_id),
            uuid.uuid4().hex,
            sanitize_filename(filename),
        ]
    )


def _client(endpoint: str) -> Any:
    """boto3 の S3 クライアントを作る（遅延 import）。"""
    import boto3
    from botocore.config import Config

    return boto3.client(
        "s3",
        endpoint_url=endpoint,
        region_name=S3_REGION,
        aws_access_key_id=S3_ACCESS_KEY,
        aws_secret_access_key=S3_SECRET_KEY,
        config=Config(
            signature_version="s3v4",
            s3={"addressing_style": S3_ADDRESSING_STYLE},
        ),
    )


def _ensure_bucket(client: Any) -> None:
    try:
        client.head_bucket(Bucket=S3_BUCKET)
    except Exception:  # noqa: BLE001 - 無ければ作成を試みる
        try:
            client.create_bucket(Bucket=S3_BUCKET)
        except Exception as e:  # noqa: BLE001
            print(f"[objstore] バケット作成に失敗（既存の可能性）: {e}")


def put_and_presign(
    data: bytes,
    *,
    filename: str,
    content_type: str | None,
    user_id: str | None,
    expiry: int | None = None,
) -> str | None:
    """バイト列を保存し、公開エンドポイントの署名付き URL を返す。失敗時 None。"""
    if not is_configured():
        return None
    key = build_key(user_id, filename)
    exp = expiry or S3_PRESIGN_EXPIRY
    try:
        up = _client(S3_ENDPOINT_URL)
        _ensure_bucket(up)
        up.put_object(
            Bucket=S3_BUCKET,
            Key=key,
            Body=data,
            ContentType=content_type or "application/octet-stream",
        )
        # 署名は公開エンドポイントのホストで生成（利用者はこの URL でアクセス）
        signer = up if S3_PUBLIC_ENDPOINT == S3_ENDPOINT_URL else _client(S3_PUBLIC_ENDPOINT)
        return signer.generate_presigned_url(
            "get_object",
            Params={"Bucket": S3_BUCKET, "Key": key},
            ExpiresIn=exp,
        )
    except Exception as e:  # noqa: BLE001 - 失敗時はフォールバック（None）
        print(f"[objstore] アップロード/署名に失敗: {e}")
        return None


def purge_prefix(prefix: str | None = None) -> int:
    """指定プレフィックス（既定は全 exApp 成果物）を削除する。削除件数を返す。

    契約終了時のデータ削除（8-(7)）で使用。
    """
    if not is_configured():
        return 0
    pfx = prefix if prefix is not None else (S3_KEY_PREFIX + "/")
    deleted = 0
    try:
        c = _client(S3_ENDPOINT_URL)
        token: str | None = None
        while True:
            kwargs: dict[str, Any] = {"Bucket": S3_BUCKET, "Prefix": pfx}
            if token:
                kwargs["ContinuationToken"] = token
            resp = c.list_objects_v2(**kwargs)
            objs = [{"Key": o["Key"]} for o in resp.get("Contents", [])]
            if objs:
                c.delete_objects(Bucket=S3_BUCKET, Delete={"Objects": objs})
                deleted += len(objs)
            if not resp.get("IsTruncated"):
                break
            token = resp.get("NextContinuationToken")
    except Exception as e:  # noqa: BLE001
        print(f"[objstore] パージに失敗: {e}")
    return deleted
