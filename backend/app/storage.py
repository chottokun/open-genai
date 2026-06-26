"""Open GENAI ローカルバックエンドの永続化レイヤ。

クラウド版では DynamoDB に保存しているチャット・メッセージを、
ローカルでは SQLite で代替する。スキーマは genai-web が要求する
型（Chat / RecordedMessage）に合わせている。
"""

from __future__ import annotations

import json
import os
import sqlite3
import threading
import time
import uuid
from typing import Any

DB_PATH = os.environ.get("DB_PATH", "/data/open-genai.db")

_lock = threading.Lock()


def _now() -> str:
    # フロントは createdDate を `new Date(Number(...))` で扱うためエポック(ms)文字列で返す
    return str(int(time.time() * 1000))


def _connect() -> sqlite3.Connection:
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    with _lock, _connect() as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS chats (
                chatId TEXT PRIMARY KEY,
                id TEXT NOT NULL,
                usecase TEXT NOT NULL DEFAULT '/chat',
                title TEXT NOT NULL DEFAULT '',
                createdDate TEXT NOT NULL,
                updatedDate TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS messages (
                messageId TEXT PRIMARY KEY,
                chatId TEXT NOT NULL,
                id TEXT NOT NULL,
                createdDate TEXT NOT NULL,
                usecase TEXT NOT NULL DEFAULT '/chat',
                userId TEXT NOT NULL DEFAULT 'local-user',
                feedback TEXT NOT NULL DEFAULT '',
                role TEXT NOT NULL,
                content TEXT NOT NULL,
                trace TEXT,
                llmType TEXT,
                extraData TEXT,
                seq INTEGER NOT NULL
            );

            CREATE TABLE IF NOT EXISTS system_contexts (
                systemContextId TEXT PRIMARY KEY,
                userId TEXT NOT NULL,
                systemContextTitle TEXT NOT NULL DEFAULT '',
                systemContext TEXT NOT NULL DEFAULT '',
                createdDate TEXT NOT NULL,
                updatedDate TEXT NOT NULL
            );
            """
        )


def create_chat() -> dict[str, Any]:
    chat_id = str(uuid.uuid4())
    now = _now()
    with _lock, _connect() as conn:
        conn.execute(
            "INSERT INTO chats (chatId, id, usecase, title, createdDate, updatedDate)"
            " VALUES (?, ?, ?, ?, ?, ?)",
            (chat_id, f"chat#{chat_id}", "/chat", "", now, now),
        )
        row = conn.execute(
            "SELECT * FROM chats WHERE chatId = ?", (chat_id,)
        ).fetchone()
    return _row_to_chat(row)


def _row_to_chat(row: sqlite3.Row) -> dict[str, Any]:
    # フロントは chatId を `chat#<uuid>` 形式で扱い decomposeId で uuid を取り出す。
    # ストレージは uuid をキーに保持し、応答時に `chat#` を付与する。
    return {
        "id": row["id"],
        "chatId": f"chat#{row['chatId']}",
        "usecase": row["usecase"],
        "title": row["title"],
        "createdDate": row["createdDate"],
        "updatedDate": row["updatedDate"],
    }


def list_chats() -> list[dict[str, Any]]:
    with _lock, _connect() as conn:
        rows = conn.execute(
            "SELECT * FROM chats ORDER BY updatedDate DESC"
        ).fetchall()
    return [_row_to_chat(r) for r in rows]


def find_chat(chat_id: str) -> dict[str, Any] | None:
    with _lock, _connect() as conn:
        row = conn.execute(
            "SELECT * FROM chats WHERE chatId = ?", (chat_id,)
        ).fetchone()
    return _row_to_chat(row) if row else None


def update_title(chat_id: str, title: str) -> dict[str, Any] | None:
    with _lock, _connect() as conn:
        conn.execute(
            "UPDATE chats SET title = ?, updatedDate = ? WHERE chatId = ?",
            (title, _now(), chat_id),
        )
        row = conn.execute(
            "SELECT * FROM chats WHERE chatId = ?", (chat_id,)
        ).fetchone()
    return _row_to_chat(row) if row else None


def delete_chat(chat_id: str) -> None:
    with _lock, _connect() as conn:
        conn.execute("DELETE FROM messages WHERE chatId = ?", (chat_id,))
        conn.execute("DELETE FROM chats WHERE chatId = ?", (chat_id,))


def _row_to_message(row: sqlite3.Row) -> dict[str, Any]:
    msg = {
        "id": row["id"],
        "createdDate": row["createdDate"],
        "messageId": row["messageId"],
        "usecase": row["usecase"],
        "userId": row["userId"],
        "feedback": row["feedback"],
        "role": row["role"],
        "content": row["content"],
    }
    if row["trace"]:
        msg["trace"] = row["trace"]
    if row["llmType"]:
        msg["llmType"] = row["llmType"]
    if row["extraData"]:
        try:
            msg["extraData"] = json.loads(row["extraData"])
        except json.JSONDecodeError:
            pass
    return msg


def list_messages(chat_id: str) -> list[dict[str, Any]]:
    with _lock, _connect() as conn:
        rows = conn.execute(
            "SELECT * FROM messages WHERE chatId = ? ORDER BY seq ASC",
            (chat_id,),
        ).fetchall()
    return [_row_to_message(r) for r in rows]


# ---------------------------------------------------------------------------
# System contexts（保存プロンプト）— クラウドの DynamoDB を SQLite で代替
# ---------------------------------------------------------------------------
def _row_to_system_context(row: sqlite3.Row) -> dict[str, Any]:
    return {
        "id": f"systemContext#{row['systemContextId']}",
        # フロントは decomposeId で `#` 分割するため composite で返す
        "systemContextId": f"systemContext#{row['systemContextId']}",
        "systemContextTitle": row["systemContextTitle"],
        "systemContext": row["systemContext"],
        "createdDate": row["createdDate"],
    }


def list_system_contexts(user_id: str) -> list[dict[str, Any]]:
    with _lock, _connect() as conn:
        rows = conn.execute(
            "SELECT * FROM system_contexts WHERE userId = ? ORDER BY createdDate DESC",
            (user_id,),
        ).fetchall()
    return [_row_to_system_context(r) for r in rows]


def create_system_context(
    user_id: str, title: str, system_context: str
) -> dict[str, Any]:
    sc_id = str(uuid.uuid4())
    now = _now()
    with _lock, _connect() as conn:
        conn.execute(
            "INSERT INTO system_contexts"
            " (systemContextId, userId, systemContextTitle, systemContext, createdDate, updatedDate)"
            " VALUES (?, ?, ?, ?, ?, ?)",
            (sc_id, user_id, title, system_context, now, now),
        )
        row = conn.execute(
            "SELECT * FROM system_contexts WHERE systemContextId = ?", (sc_id,)
        ).fetchone()
    return _row_to_system_context(row)


def update_system_context_title(
    user_id: str, sc_id: str, title: str
) -> dict[str, Any] | None:
    with _lock, _connect() as conn:
        conn.execute(
            "UPDATE system_contexts SET systemContextTitle = ?, updatedDate = ?"
            " WHERE systemContextId = ? AND userId = ?",
            (title, _now(), sc_id, user_id),
        )
        row = conn.execute(
            "SELECT * FROM system_contexts WHERE systemContextId = ? AND userId = ?",
            (sc_id, user_id),
        ).fetchone()
    return _row_to_system_context(row) if row else None


def delete_system_context(user_id: str, sc_id: str) -> None:
    with _lock, _connect() as conn:
        conn.execute(
            "DELETE FROM system_contexts WHERE systemContextId = ? AND userId = ?",
            (sc_id, user_id),
        )


def create_messages(chat_id: str, messages: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """ToBeRecordedMessage[] を保存し RecordedMessage[] を返す。"""
    recorded: list[dict[str, Any]] = []
    with _lock, _connect() as conn:
        row = conn.execute(
            "SELECT COALESCE(MAX(seq), 0) AS m FROM messages WHERE chatId = ?",
            (chat_id,),
        ).fetchone()
        seq = row["m"]
        for m in messages:
            seq += 1
            message_id = m.get("messageId") or str(uuid.uuid4())
            created = m.get("createdDate") or _now()
            usecase = m.get("usecase") or "/chat"
            extra = m.get("extraData")
            rec = {
                "id": f"message#{message_id}",
                "createdDate": created,
                "messageId": message_id,
                "usecase": usecase,
                "userId": "local-user",
                "feedback": "",
                "role": m["role"],
                "content": m.get("content", ""),
            }
            if m.get("trace"):
                rec["trace"] = m["trace"]
            if m.get("llmType"):
                rec["llmType"] = m["llmType"]
            if extra:
                rec["extraData"] = extra
            conn.execute(
                "INSERT OR REPLACE INTO messages"
                " (messageId, chatId, id, createdDate, usecase, userId, feedback,"
                "  role, content, trace, llmType, extraData, seq)"
                " VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                (
                    message_id,
                    chat_id,
                    rec["id"],
                    created,
                    usecase,
                    "local-user",
                    "",
                    m["role"],
                    m.get("content", ""),
                    m.get("trace"),
                    m.get("llmType"),
                    json.dumps(extra, ensure_ascii=False) if extra else None,
                    seq,
                ),
            )
            recorded.append(rec)
        conn.execute(
            "UPDATE chats SET updatedDate = ? WHERE chatId = ?", (_now(), chat_id)
        )
    return recorded
