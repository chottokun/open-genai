# Upstream 同期・評価レポート（2026年9月22日実施）

## 1. 概要

本レポートは、公式 Upstream リポジトリ (`https://github.com/hirokawaguchi/open-genai.git`) のコミット `0dc47ee`（v0.10.0 リリース以降）から最新コミット `aeab167` までの合計 22 件のコミットについて、差分・セキュリティ・影響度のアセスメントを行い、方針B（選択的パッチ適用・LGWAN閉域網セキュリティ維持）に基づき取り込み検討と統合を実施した結果をまとめたものです。

---

## 2. 評価対象 Upstream コミット群 (`0dc47ee` .. `aeab167`)

| コミット | タイトル / 内容 | 評価結果・対応方針 |
| --- | --- | --- |
| `8483c15` / `7ffa555` | 未登録モデルのチャット添付と姓名の対応を直す | **選択統合**: 未登録モデルのファイル添付許可 (`useFileUploadable.ts`) および `usermgmt-app` での日本語 CSV 見出し（`姓`, `名`）と姓名自動分割ロジックを取り込み。 |
| `8d6e6ff` / `6a3333a` | 氏名は姓のみ必須・名は任意にする | 保留: 既存の User Profile 設定および Keycloak realm 互換性を考慮し保留。 |
| `ec8382b` / `c8003d2` | pptx フリーフォーム自由配置と書き出し | 保留: プレゼン資料自動生成用の独立モジュール。LGWAN 閉域方針に基づき保留。 |
| `2985c0a` / `dbe5fc7` | HTML 縦スクロール文書化・PPTX notes-first | 保留: procuretech 関連。 |
| `614e134` .. `c828978` | tenants 棟管理・共有棟・おすすめアプリ出し分け | 保留: 多棟分離・マルチテナント認証構造はローカル単一拠点運用方針（方針B）に従い保留。 |
| `4801a03` / `d363113` | PPTX 向け Mermaid 図のスライド PNG 生成 | 保留: 画像生成・図表レンダラーモジュール。 |
| `65da3aa` / `cfc09f9` | おすすめアプリ Set 推論での tsc 型修復 | 保留: `tenants` 依存機能の修正のため保留。 |
| `aeab167` / `0687d01` | Markdown エディタのパンくずリスト統一 | 保留: `procuretech-editor` 独立エディタ用 UI 修正のため保留。 |

---

## 3. 選択統合された改善事項の詳細

### 1) 未登録ローカルモデル選択時のチャット添付ドキュメント許可
- **変更ファイル**: `genai-web/packages/web/src/features/chat/hooks/useFileUploadable.ts`
- **内容**: メタデータに登録されていないローカルモデル（例: `.gguf` モデルや新規インポートモデル）が選択された場合でも、テキスト抽出バックエンド（`backend/app`）で解析可能な `.pdf` や `.docx` などのドキュメント添付を許可するようフォールバック判定を追加。
- **検証**: `genai-web/packages/web/tests/features/chat/hooks/useFileUploadable.test.ts` を新規作成し Vitest で検証。

### 2) Keycloak 利用者一括管理 (`usermgmt-app`) の日本語 CSV 支援
- **変更ファイル**: `usermgmt-app/app/kcadmin.py`, `usermgmt-app/app/main.py`
- **内容**: CSV 見出しに `姓`, `名`, `family_name`, `given_name` などの日本語・一般名を認識可能にするエイリアスを追加。さらに `name`（表示名）列に「山田 太郎」のように空白区切りで入力された際、`lastName`（山田）と `firstName`（太郎）へスマートに分割して Keycloak UserRepresentation へマッピングする処理を実装。
- **検証**: `usermgmt-app/tests/test_kcadmin.py` を新規作成し pytest で検証。

---

## 4. セキュリティおよび回帰テスト検証結果

### 1) 依存関係セキュリティスキャン (`pip-audit`)
- **コマンド**: `scripts/audit-python-deps.sh`
- **結果**: 13 個の Python requirements ファイルにおいて、検出された脆弱性は **0 件 (100% CLEAN)**。

### 2) バックエンド回帰テスト (pytest)
- **コマンド**: `PYTHONPATH=usermgmt-app uv run pytest`
- **結果**: 113 ケースすべて **PASSED (100%)**。

### 3) フロントエンド回帰テスト (Vitest)
- **コマンド**: `cd genai-web && npm run web:test`
- **結果**: **PASSED (100%)**。
