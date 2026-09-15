# Upstream 同期評価およびセキュリティ検証レポート (v0.10.0 / 2026-09-15)

## 概要

本レポートは、フォーク元（`upstream: https://github.com/hirokawaguchi/open-genai.git`）の最新コミット群（v0.10.0 リリース `3a8fefc` およびブランチ `fix/chat-upload-and-name-order` コミット `8483c15` まで）の変更を評価し、方針B（閉域性・セキュリティ境界・LiteLLM等の一本化優先）に基づく選択的取り込み（チェリーピック／パッチ適用）およびセキュリティ監査・全テスト検証の結果を記録したものです。

---

## Upstream 変更評価と判定

| コミット / PR | 概要 | 判定 | 理由・方針 |
| --- | --- | --- | --- |
| `8483c15` | 未登録モデルのチャット添付（`useFileUploadable`）と Keycloak 姓名対応・CSV 見出し補正 | **取り込み (Patch)** | 既存モデルID未登録時でもテキスト抽出/添付を可能にするUX改善および日本語姓名順（`lastName` 姓 / `firstName` 名）整合の安全な修正のため。 |
| `3a8fefc` / `23e29ee` / `fa018c8` / `428bae4` / `7823567` | `notebook-app` (ノートブック機能・ヒアリングシート回収) | **保留 (Defer)** | 独立マイクロサービスであり、LGWAN閉域網境界・LiteLLMプロキシ集約方針維持のため。 |
| `87dd5fc` / `778570e` | `ssh-app` (Web SSH ターミナル) & asyncssh 脆弱性対応 | **保留 (Defer)** | LGWAN環境におけるWeb経由SSH接続口の不要な攻撃面拡大を回避するため。 |

---

## 実施した変更内容

1. **チャット添付可否判定のフォールバック (`useFileUploadable.ts`)**:
   - `MODELS.modelMetadata` に登録されていないローカルモデルID（`gemma-4-26B...` 等）であっても、`doc: true`（テキスト/ドキュメント添付）を有効として判定するよう修正。
   - `gemma-4-26B-A4B-it-Q4_K_M.gguf` をモデルメタデータに追加。
   - `useFileUploadable.test.ts` に単体テストを追加。

2. **Keycloak 姓名順・CSV取り込み正規化 (`kcadmin.py`, `realm-open-genai.json`)**:
   - Keycloak 初期データおよび CSV インポートにおける日本語の姓名順を整合（`lastName` ＝ 姓、`firstName` ＝ 名）。
   - CSV 見出しの「姓」「名」「family_name」「given_name」等の日本語・エイリアス対応を追加。
   - `test_kcadmin.py` に分割・マッピング検証テストを追加。

3. **セキュリティ依存関係アップグレード**:
   - `pypdf` を `6.15.0` から `6.16.2` に更新（`backend/requirements.txt`, `rag-app/requirements.txt`, `tests/requirements.txt`）。
   - `accelerate` を `1.14.0` から `1.15.0` に更新（`local-sd-api/requirements.txt`）。
   - `scripts/audit-python-deps.sh` によるスキャン（13 requirements ファイル）を実施し、既知の脆弱性 0 件を達成。

---

## 検証結果

- **セキュリティ監査**: `scripts/audit-python-deps.sh` -> **0 vulnerabilities**
- **バックエンドテスト**: `scripts/run-regression-tests.sh` -> **109/109 passed** (4 skipped)
- **フロントエンドテスト**: `npm run web:test` -> **635/635 passed** (55 test files)

---

## 結論

Upstream v0.10.0 までの変更点評価に基づき、閉域境界を維持しつつ安全かつ高価値な UX / 認証バグ修正（コミット `8483c15` 相当）を統合し、全セキュリティ監査と全テストのグリーン状態を確認しました。
