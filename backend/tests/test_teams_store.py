"""teams_store インデックス作成および権限判定高速化のテスト"""
import sqlite3
import pytest
from app import teams_store


@pytest.fixture(autouse=True)
def setup_tmp_teams_db(tmp_path, monkeypatch):
    db_path = str(tmp_path / "test_teams.db")
    monkeypatch.setattr(teams_store, "DB_PATH", db_path)
    teams_store.init_db()
    yield db_path


def test_teams_store_indices_created():
    """team_users および exapps テーブルに最適化インデックスが作成されているか検証"""
    with teams_store._connect() as conn:
        rows = conn.execute("SELECT name FROM sqlite_master WHERE type='index'").fetchall()
        indices = [r["name"] for r in rows]
        assert "idx_team_users_user" in indices
        assert "idx_exapps_team" in indices


def test_user_admins_any_team_performance_query():
    """user_admins_any_team が正しく動作しインデックス経由で照合されるか検証"""
    user_id = "user_test_admin@example.com"
    team_id = "team_admin_1"

    with teams_store._connect() as conn:
        conn.execute(
            "INSERT INTO teams (teamId, teamName, createdDate, updatedDate) VALUES (?, ?, '2026-07-31', '2026-07-31')",
            (team_id, "Admin Team")
        )
        conn.execute(
            "INSERT INTO team_users (teamId, userId, username, isAdmin, createdDate, updatedDate) VALUES (?, ?, ?, 1, '2026-07-31', '2026-07-31')",
            (team_id, user_id, "Admin User")
        )

    assert teams_store.user_admins_any_team(user_id) is True
    assert teams_store.user_admins_any_team("non_existent_user@example.com") is False
