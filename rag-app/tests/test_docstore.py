"""rag-app docstore バッチ最適化・インデックス・エッジケーステスト"""
import os
import sqlite3
import pytest

from app import docstore


@pytest.fixture(autouse=True)
def setup_tmp_db(tmp_path, monkeypatch):
    db_path = str(tmp_path / "test_docstore.db")
    monkeypatch.setattr(docstore, "DB_PATH", db_path)
    docstore.init_db()
    yield db_path


def test_get_nodes_with_text_empty():
    assert docstore.get_nodes_with_text("doc1", []) == []


def test_get_nodes_with_text_batch_and_ordering():
    doc_id = "doc_test_1"
    
    # 親レコード docs およびページデータ挿入
    with docstore._connect() as conn:
        conn.execute(
            "INSERT INTO docs (doc_id, scope, source, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
            (doc_id, "scope1", "source1", "2026-07-31T00:00:00Z", "2026-07-31T00:00:00Z")
        )
        conn.execute(
            "INSERT INTO pages (doc_id, page, text) VALUES (?, ?, ?)",
            (doc_id, 1, "Page 1 Content")
        )
        conn.execute(
            "INSERT INTO pages (doc_id, page, text) VALUES (?, ?, ?)",
            (doc_id, 2, "Page 2 Content")
        )
        # ツリーノード挿入
        conn.execute(
            """
            INSERT INTO tree_nodes (doc_id, node_id, title, summary, page_start, page_end, parent_id, sort_order)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (doc_id, "node_1", "Title 1", "Summary 1", 1, 1, None, 1)
        )
        conn.execute(
            """
            INSERT INTO tree_nodes (doc_id, node_id, title, summary, page_start, page_end, parent_id, sort_order)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (doc_id, "node_2", "Title 2", "Summary 2", 2, 2, "node_1", 2)
        )

    # 順序指定（node_2, non_existent, node_1）
    res = docstore.get_nodes_with_text(doc_id, ["node_2", "non_existent", "node_1"])
    assert len(res) == 2
    assert res[0]["node_id"] == "node_2"
    assert res[0]["text"] == "Page 2 Content"
    assert res[1]["node_id"] == "node_1"
    assert res[1]["text"] == "Page 1 Content"


def test_get_nodes_with_text_chunking_over_500():
    doc_id = "doc_test_large"
    node_ids = [f"node_{i}" for i in range(600)]

    with docstore._connect() as conn:
        conn.execute(
            "INSERT INTO docs (doc_id, scope, source, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
            (doc_id, "scope1", "source1", "2026-07-31T00:00:00Z", "2026-07-31T00:00:00Z")
        )
        conn.execute(
            "INSERT INTO pages (doc_id, page, text) VALUES (?, ?, ?)",
            (doc_id, 1, "Large Document Page 1")
        )
        for i in range(600):
            conn.execute(
                """
                INSERT INTO tree_nodes (doc_id, node_id, title, summary, page_start, page_end, parent_id, sort_order)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (doc_id, f"node_{i}", f"Title {i}", f"Summary {i}", 1, 1, None, i)
            )

    res = docstore.get_nodes_with_text(doc_id, node_ids)
    assert len(res) == 600
    assert res[0]["node_id"] == "node_0"
    assert res[599]["node_id"] == "node_599"


def test_indices_created():
    with docstore._connect() as conn:
        rows = conn.execute("SELECT name FROM sqlite_master WHERE type='index'").fetchall()
        indices = [r["name"] for r in rows]
        assert "idx_tree_nodes_parent" in indices
