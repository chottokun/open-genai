# Upstream Sync Verification Report - v0.5.0

本レポートは、公式 Upstream リポジトリ (`https://github.com/hirokawaguchi/open-genai`) の `v0.5.0` リリース内容に対する、当コードベース (`main` ブランチ) への反映・検証結果を記述したものです。

---

## 1. Upstream v0.5.0 機能・修正項目の反映状況一覧

| Upstream PR / コミット | 機能・修正概要 | 当コードベースへの反映状態 | 備考 |
|---|---|---|---|
| **#16 `fix/saml-proxy-headers`** | SAML ACS/SLS URL の `X-Forwarded-*` ヘッダ動的バインド、Keycloak 重複 Attribute 許可 | **完全反映済み** | PR #18 にてマージ完了・単体テスト追加済み |
| **#17 `fix/auth-error-clean-relogin`** | SAML 例外発生時の IdP キャッシュ破棄、401 応答時/エラー画面到達時の壊れた JWT 自動消去 (`clearToken`) | **完全反映済み** | PR #21 にてマージ完了・単体テスト追加済み |
| **#23 `feat/account-username-display`** | ログイン中ユーザー表示名 (`userDisplayName`) のヘッダー・モバイルメニューへの動的描画 | **完全反映済み** | PR #21 にてマージ完了・UI テスト追加済み |
| **#7 `feat/multi-provider-llm`** | 複数 LLM プロバイダー設定 | **同等機能統合済み** | LiteLLM 統合 (`litellm_config.yaml`) により完全に抽象化・対応済み |
| **#13 `feat/dify-hide-inputs`** | Dify 連携フォーム項目制御 | **対応済み** | `dify-app` 統合により対応済み |
| **#22 `feat/image-fastsd-backend`** | FastSD(CPU) 専用プロキシコンテナ | **代替（アーキテクチャ最適化）** | プロジェクト開発ルール (`AGENTS.md`) に従い、中間コンテナを排して LiteLLM / バックエンド直接接続に統合 |

---

## 2. 依存関係およびセキュリティ監査

- **`pypdf` 脆弱性対策 (CVE-2026-59938 等)**: `6.14.2` へ更新完了
- **`pip-audit` 実行結果**: 脆弱性 **0 件 (100% CLEAN)**

---

## 3. 回帰テスト・品質検証

- **Python バックエンドテスト (pytest)**: 86件中 86件 **PASSED** (+ 追加テスト `test_saml_auth.py`, `test_docstore.py`)
- **Web フロントエンドテスト (Vitest)**: 52ファイル / 625件 **PASSED** (+ 追加テスト `AccountMenu.test.tsx`, `localAuth.test.ts`)
- **TypeScript ビルド検証**: 型エラー・ビルドエラーゼロで本番用静的アセット生成確認

---

## 4. 結論

Upstream `v0.5.0` の高価値かつ安全な機能・修正（認証・SAML連携強化、エラーリカバリ、UIユーザー表示名等）はすべて選択的に取り込まれ、当プロジェクトの設計思想（コンテナ統合・リソース節約・LiteLLM直結）を維持した上で、完全に統合・検証されています。
