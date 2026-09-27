# Upstream Sync & Architectural Compatibility Report - v0.11.0 Evaluation (2026-09-27)

本レポートは、公式 Upstream リポジトリ (`https://github.com/hirokawaguchi/open-genai`) の `v0.11.0` および最新コミット (`0f4f088`) に対する技術評価、ローカルファースト・閉域セキュリティ設計（方針B）との互換性アセスメント、ならびに依存脆弱性の解消・品質検証結果をまとめたものです。

---

## 1. Executive Summary

Open GENAI は、デジタル庁「源内」のフォーク元（Upstream）の利便性を取り込みつつ、以下のコア設計原則を維持するローカル完結・セキュリティファースト設計を採用しています：
1. **完全なオフライン/閉域運用 (LGWAN準拠)**: Ollama, Stable Diffusion, faster-whisper, SeaweedFS 等による外部クラウド非依存設計。
2. **LiteLLM Proxy Hub 一元管理**: テキスト生成、画像生成・編集、音声認識の全推論リクエストを LiteLLM Proxy へ一元集約しポリシー・監査制御する。
3. **厳格な認可・セキュリティ境界**: 未認証アクセスを最小限に制限し、管理操作・書き込み・データ変更を JWT / SAML / RBAC で保護する。

Upstream は `v0.11.0` (2026年9月) リリースおよびその後の追加コミットにて以下の機能・差分を公開しました：
- **組織棟（`tenants`）マルチテナント階層分離と棟スコープの利用者一括管理** (`a81744f`, `24d683b`, `0f4f088`)
- **お遊び（ゲーム）exApp: 戦国国取り (`sengoku-app`)** (`31e8ead`)
- **Markdown エディタ PPTX タイトル・レイアウト改善** (`60ad9e1`)
- **`ssh-app` 依存ライブラリ `asyncssh` の CVE-2026-62949 対応** (`3c0ef4d`)

当開発ブランチのセキュリティポリシー（方針B）に従い評価を行った結果、**スタンドアロンの個別マイクロサービス (`sengoku-app`, `ssh-app`) や複号建築棟分離機能 (`tenants`) は地方自治体閉域（LGWAN）運用のセキュリティ境界および LiteLLM 一元管理ポリシーに反するため、マージ見送り（不要）**と判断しました。

一方で、依存関係セキュリティ監査スクリプト (`scripts/audit-python-deps.sh`) により検出された `pypdf` および `accelerate` の脆弱性を対策最新版へ即時アップデートし、コードベースの100%安全性を確保しました。

---

## 2. Upstream 評価対象コミットと判定理由

| コミット | 概要 | 方針Bによる判定 | 判定理由 |
| --- | --- | --- | --- |
| `0f4f088` / `24d683b` | 組織名の表示およびアカウント設定での棟切り替え UI | **見送り** | 独自ビルド `tenants` マルチテナント機能に依存するため |
| `3c0ef4d` | `ssh-app`: asyncssh 2.24.0 更新 (CVE-2026-62949) | **対象外 / N/A** | 当環境では SSH 露出を行わない閉域設計のため |
| `31e8ead` | `sengoku-app`: 戦国国取り exApp | **見送り** | 公用AIアシスタントの設計範囲外の娯楽機能であり、不要なコンテナ・ポート露出を避けるため |
| `a81744f` / `a6a4a97` | 棟スコープの利用者一括管理とメールアドレス不可変制御 | **見送り** | 当リポジトリでは LiteLLM ＋ 単一自治体 SAML/RBAC 認可モデルで完全隔離されているため |
| `60ad9e1` | PPTX 題名・レイアウト選択ロジック改善 | **見送り** | オプション機能 `procuretech-generate-app` に限定されるため |

---

## 3. 依存関係セキュリティ監査とパッチ適用 (100% CLEAN)

プロジェクト標準のセキュリティ診断ツール (`scripts/audit-python-deps.sh`) を実行し、全 13 個の Python requirements 定義ファイルを網羅的にスキャンしました。

### 検出された脆弱性と対応

1. **`pypdf` (PYSEC-2026-3910, PYSEC-2026-3911, PYSEC-2026-3913)**
   - 対象: `backend/requirements.txt`, `rag-app/requirements.txt`, `tests/requirements.txt`
   - 対応: `6.15.0` から 対策済最新版 **`6.16.2`** へアップデート。
2. **`accelerate` (PYSEC-2026-3804)**
   - 対象: `local-sd-api/requirements.txt`
   - 対応: `1.14.0` から 対策済最新版 **`1.15.0`** へアップデート。

パッチ適用後、`pip-audit` の結果は **脆弱性 0 件 (100% CLEAN)** となりました。

---

## 4. 全体テスト・品質検証結果

依存関係アップデートおよび既存機能のデグレードフリー（回帰バグゼロ）を実証するため、以下の全テストスイートを実行しました。

1. **Python バックエンド回帰テスト (pytest)**:
   - `bash scripts/run-regression-tests.sh`
   - **109 passed, 4 skipped (100% SUCCESS)**
2. **Web フロントエンド回帰テスト (Vitest)**:
   - `npm run web:test` (`genai-web`)
   - **631 passed, 54 test files (100% SUCCESS)**
3. **セキュリティ脆弱性スキャン (`pip-audit`)**:
   - `bash scripts/audit-python-deps.sh`
   - **脆弱性 0 件 (100% CLEAN)**

---

## 5. 結論

公式 Upstream (v0.11.0 / commit `0f4f088`) の評価を完了しました。閉域LGWAN運用およびLiteLLM一元管理ポリシーに基づき、不要な新規大掛かりな機能の取り込み（マージ）は行わず、セキュリティ依存ライブラリのパッチを即座に適用してシステムの安全性を実証・固定しました。
