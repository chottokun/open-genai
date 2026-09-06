# Upstream 同期評価報告書 (v0.9.0)

## 1. 概要
- **評価日**: 2026年9月6日
- **対象 Upstream バージョン**: v0.8.0 ～ v0.9.0 (コミット `ede98cd` まで)
- **同期方針**: 方針B (Selective Patch & Cherry-pick)
- **結果**: 依存パッケージのセキュリティ修正および選択モデル確定処理（堅牢化）を取り込み検証完了。

---

## 2. Upstream 変更点評価および対応方針

### 取り込み・選択適用項目
1. **セキュリティ依存関係の更新 (`pypdf` 6.16.2)**
   - **内容**: Upstream コミット `cc9b77f` (PR #54) にて、`pypdf` 6.15.0 における既知の脆弱性 (CVE-2026-84309, CVE-2026-84310, CVE-2026-84311) を解決するため、`pypdf` が 6.16.2 に更新された。
   - **対応**: ローカルの `backend/requirements.txt`、`rag-app/requirements.txt`、および `tests/requirements.txt` の `pypdf` を 6.16.2 にアップグレード。`scripts/audit-python-deps.sh` で全 13 requirements ファイルの脆弱性 0件を確認。

2. **フロントエンドモデル選択の堅牢化 (`useSelectedModel` / `models.ts`)**
   - **内容**: Upstream コミット `f4e46f5` (PR #48) にて、Vite 埋め込み環境変数や `localStorage` に保存されたモデル ID の解決ロジック (`parseEnvStringList`, `resolveSelectedModelId`) が導入された。
   - **対応**: ローカルの LiteLLM / 源内一本化インターフェースに整合する形で `genai-web/packages/web/src/models.ts` および `useSelectedModel.ts` へ安全に取り込み。

### 保留・見送り項目 (LGWAN閉域網・ローカルファーストアーキテクチャ保護のため)
1. **Procuretech (情報化企画書ナビ・エディタ) ExApp**
   - **理由**: 自治体 LGWAN 閉域網向けローカル生成 AI 基盤においては、LiteLLM Hub 経由の標準チャット/RAG/画像生成モデルインターフェースを中心に運用を行うため、特定の外部業務手続きアプリ群はオプトイン拡張として保留。
2. **アカウント設定（自己表示名・パスワード変更）機能 (`self-account-settings`)**
   - **理由**: 本リポジトリは Keycloak / SAML 統合SSO環境での一元管理を標準としており、個別パスワード変更エンドポイントの開放は見送り。

---

## 3. テスト及び検証結果

1. **セキュリティ監査 (`scripts/audit-python-deps.sh`)**
   - スキャン対象: 全 13 `requirements.txt`
   - 検出された脆弱性: **0件** (PASS)

2. **バックエンド・リグレッションテスト (`scripts/run-regression-tests.sh` / pytest)**
   - 通過テスト数: **109 passed**, 4 skipped (PASS)

3. **フロントエンド Web テスト (`npm run web:test` / vitest)**
   - 通過テスト数: **54 test files, 631 tests passed** (PASS)

---

## 4. 結論
Upstream v0.9.0 までの変更内容を精査し、必要なセキュリティパッチおよび堅牢化処理をローカル環境へ安全に統合しました。全自動テストおよび依存関係脆弱性スキャンにおいて問題がないことを確認済みです。
