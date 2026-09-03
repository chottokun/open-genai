# Upstream v0.8.0 追従評価および最新コミット同期検証レポート (2026-09-03)

## 1. 概要

本レポートは、フォーク元（Upstream: `https://github.com/hirokawaguchi/open-genai`）の最新コミット（`7a73260` までの変更点）に対する同期状態および互換性の検証結果をまとめたものです。

現在、ローカルのリポジトリは Upstream の `v0.8.0`（およびそれ以降の `slice/*` コミット群）を完全に統合・検証済みであり、新規にマージすべき未取り込みコミットが存在しないことが確認されました。

---

## 2. Upstream 最新コミットの評価と統合状態

Upstream/main の `v0.8.0` 以降のコミット群および評価結果は以下の通りです：

| Commit SHA | タイトル・内容 | 当リポジトリにおける統合状況・評価 |
| :--- | :--- | :--- |
| `7a73260` / `74e74b4` | feat(infra): Whisper GPU 接続口とサイト overlay 契約・公開ドキュメント | 統合済み（local-whisper-api およびオーバーレイ文書） |
| `578684c` / `6a5b0cf` | fix(proxy): Keycloak 静的リソースの rate limit 除外と管理許可の分割 | 統合済み（Nginx リバースプロキシ設定および認可分離） |
| `6cdb198` / `a786e9d` | feat(exapp): 管理アプリ共通ヘッダ・会話削除・固定チーム保護を追加 | 統合済み（ManagedAppHeader, 会話削除ダイアログ） |
| `a78999e` / `e473c62` | feat(branding): サービス名称を VITE_APP_TITLE / APP_TITLE で差し替え可能に | 統合済み（ブランド名設定環境変数） |
| `4ea1d49` / `2c0d3b3` | test(web): env 依存で CI 移植性のない models 単体テストを除去 | 統合済み（CI移植性テスト改善） |
| `f4e46f5` | feat(web): モデル選択の解決を一元化しチャット復旧を堅牢化 | 統合済み（`resolveSelectedModelId` 共通関数） |
| `684a1ab` | feat(llm): Qwen 思考オフ・reasoning 読取・構造化出力を汎用化 | 統合済み（LiteLLM / Qwen 思考制御） |
| `0741288` | fix(web): HTTP/LAN 互換の共通化とプロンプト「チャットで開く」修正 | 統合済み（copyToClipboard, toAbsoluteUrl, uuid） |

---

## 3. 基本方針（方針B：選択的取り込み）との整合性

1. **LiteLLM 一本化ポリシーの維持**
   - 主力テキスト生成および画像生成はすべて LiteLLM プロキシハブ経由に集約。
   - プロバイダ直接接続や未認証パブリックエンドポイントの開放を行わず、堅牢な閉域網セキュリティ（LGWAN境界）を担保。

2. **外部公開型ミクロサービスの分離・制限**
   - 庁外向けパブリックフォーム (`patchform-app`) 等の未認証インgress機能は、閉域網の要求仕様に基づき本線稼働環境から隔離。

---

## 4. セキュリティ・依存関係・テスト検証結果

1. **依存関係セキュリティスキャン (`scripts/audit-python-deps.sh`)**
   - 13 個の Python モジュール依存関係ファイルを監査。
   - `pypdf` は `6.15.0` へアップグレード済み（CVE-2026-71852, CVE-2026-71870 対応済み）。

2. **バックエンドテスト (`scripts/run-regression-tests.sh` / `pytest`)**
   - **109 passed**, 4 skipped (100% 成功)

3. **フロントエンドテスト (`genai-web / Vitest`)**
   - **631 passed** (54 テストファイル全て 100% 成功)

---

## 5. 結論

Upstream/main (7a73260) との完全同期と検証が完了しました。追加で必要なコード変更はなく、すべてのテストがパスしているため、同期ワークフローを完了と判断します。
