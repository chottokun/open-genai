# Upstream Evaluation and Security Audit Report (2026-09-25)

## 1. 概要 (Overview)
- **評価実施日**: 2026年9月25日
- **評価対象 upstream リポジトリ**: `https://github.com/hirokawaguchi/open-genai`
- **評価コミット範囲**: `a81744f` から `3c0ef4d` (最新コミット)
- **評価基準**: 地方自治体・LGWAN 閉域網運用におけるセキュリティ境界の維持（方針B / Policy B: マイクロサービスの無駄な拡大・外部公開エンドポイントの抑止、安全な機能・バグ修正の選択的取り込み）。

---

## 2. コミット別評価と取り込み判定 (Upstream Commits Evaluation)

| コミット SHA | 変更内容 / 機能 | 評価結果 / 判定 | 判定理由・詳細 |
|---|---|---|---|
| `31e8ead` | `feat(sengoku)`: 戦国国取り（お遊び）exApp 及び `sengoku-app` マイクロサービスの追加 | **見送り (Deferred - Policy B)** | LGWAN 閉域網運用および自治体業務向け生成AIプラットフォームの目的に照らし、不要な遊戯系マイクロサービス拡張を避けセキュリティ境界・リソースを保全するため。 |
| `3c0ef4d` | `fix(ssh)`: `ssh-app` 内 `asyncssh` を 2.24.0 へ更新（CVE-2026-62949 対応） | **対象外 (N/A)** | `ssh-app` はローカルリポジトリで既に非採用（方針Bで取り込み見送り済み）のため、ローカルコードベースへの影響なし。 |

---

## 3. セキュリティ脆弱性スキャン・依存関係更新 (Security & Dependency Hardening)

`scripts/audit-python-deps.sh` (pip-audit) による全13個の Python `requirements.txt` ファイルのスキャン結果に基づき、以下のセキュリティパッチを適用・検証しました。

1. **`pypdf` パッケージ更新**: `6.15.0` -> `6.16.2`
   - 対象: `backend/requirements.txt`, `rag-app/requirements.txt`, `tests/requirements.txt`
   - 解決された脆弱性: `PYSEC-2026-3910`, `PYSEC-2026-3911`, `PYSEC-2026-3913`
2. **`accelerate` パッケージ更新**: `1.14.0` -> `1.15.0`
   - 対象: `local-sd-api/requirements.txt`, `tests/requirements.txt`
   - 解決された脆弱性: `PYSEC-2026-3804`

**監査結果**: 全 13要件ファイルにて **既知の脆弱性 0件** (0 vulnerabilities) を確認。

---

## 4. 回帰テスト検証結果 (Regression Testing)

- **Backend (Python / pytest)**:
  - 実行コマンド: `bash scripts/run-regression-tests.sh --python-only`
  - 結果: **109 passed, 4 skipped** (100% 成功)
- **Frontend (Web / Vitest)**:
  - 実行コマンド: `bash scripts/run-regression-tests.sh --web-all`
  - 結果: **全 Vitest テスト Pass** (100% 成功)

---

## 5. 結論 (Conclusion)
Upstream の最新更新（`31e8ead`〜`3c0ef4d`）について評価を行い、方針Bに従ってスタンドアロンお遊びマイクロサービス（`sengoku-app`）の不必要な取り込みは見送り、依存パッケージのセキュリティ修正（`pypdf`, `accelerate`）を確実に実施しました。全リグレッションテストおよびセキュリティ監査をパスしており、開発・本番ブランチへの安全な同期準備が完了しています。
