# Upstream (hirokawaguchi/open-genai) v0.8.0 差分評価およびセキュリティ・品質検証レポート

## 1. 概要
本レポートは、`upstream/main`（最新 5de2e5a / 2026年8月31日時点）の更新内容を調査・評価し、本開発ブランチ（LiteLLM 統合・LGWAN 閉域網セキュリティ設計重視）への取り込み可否および方針を決定した結果を記録するものです。

## 2. Upstream 差分コミットと評価一覧

| コミット | 変更概要 | 取り込み判断 | 評価理由 |
|---|---|---|---|
| `5de2e5a` / `85fddcb` | Anthropic `extra_body`（`max_tokens`等）およびモデル表示追加 | 保留・対象外 | 本ブランチは LiteLLM Gateway プロキシ (`litellm_config.yaml`) でモデル設定・パラメータを一元管理する設計のため、LLM_PROVIDERS への個別対応は不要。 |
| `ffe5e2c` / `423ab58` | 未起動の書類読取(doccheck)・フォーム(patchform)をおすすめから外す | 対象外 | 本ブランチは doccheck / patchform を非搭載としており、おすすめメニュー定義構成が異なるため影響なし。 |
| `11decfc` / `ca367b7` | Difyアプリでフッターを隠しストリーミング中のカクつきを防ぐ | チェリーピック適用 | `/apps` 画面で `Footer` を非表示化する微修正。ストリーミングスクロール品質向上に寄与。 |
| `0b9b121` | patchform ラジオコンポーネントのデザインシステム統一 | 対象外 | patchform マイクロサービスは非搭載のため。 |
| `d48cb96` | docs: README バージョン更新 (v0.8.0) | 対象外 | ローカルブランチ独自のドキュメント運用を維持。 |
| `9a6eaeb` | docs: CHANGELOG 追記 (v0.8.0) | 対象外 | ローカル CHANGELOG に本評価作業結果を反映。 |
| `2e18c02` | Difyチャットのストリーミング中自動スクロール円滑化 (`ExAppChat.tsx`) | 導入済み | v0.8.0 評価時にチェリーピック適用済み。 |

## 3. セキュリティ脆弱性監査 (`pip-audit`)
13 個の Python `requirements.txt` 全体を対象に依存パッケージの脆弱性スキャンを実施：
- スキャン対象: `audit-app`, `backend`, `dify-app`, `knowledge-mcp`, `local-sd-api`, `local-whisper-api`, `modelpolicy-app`, `ngword-app`, `prompt-app`, `rag-app`, `tests`, `usermgmt-app`, `whisper-app`
- 結果: **既知の脆弱性は検出されませんでした (0 vulnerabilities)** (`pypdf==6.15.0` 等の最新セキュリティパッチ適用状態を維持)。

## 4. 全体回帰テスト結果
- **Backend (Pytest)**: 109 passed, 4 skipped (100% SUCCESS)
- **Frontend (Vitest)**: 54 passed (631 passed tests) (100% SUCCESS)

## 5. 結論
Upstream v0.8.0 の追加差分のうち、本ブランチのアーキテクチャ方針（LiteLLMプロキシ中心）に合致する有用な微修正 (`ca367b7`: `/apps` フッター非表示化) を適用し、セキュリティ脆弱性 0 件および全 740 件超の回帰テスト PASS を確認しました。
