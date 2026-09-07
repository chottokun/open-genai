# Upstream 同期評価・方針策定レポート (v0.9.0 評価 2026-09-08)

## 1. 概要

本レポートは、フォーク元（Upstream: `https://github.com/hirokawaguchi/open-genai`）における v0.9.0 (コミット `2f1dc29` / `c0a550f`) 以降の最新コミット群（〜 `77b0064`）を網羅的に評価し、当リポジトリ（Open GENAI）への取り込み方針を定義・適用した結果を記録するものです。

---

## 2. 評価対象の Upstream コミット一覧

| コミット | 概要 | 評価・分類 |
| :--- | :--- | :--- |
| `c0a550f` / `2f1dc29` | v0.9.0 リリース（Markdown エディタ＋各種文書作成、`pypdf==6.16.2`） | セキュリティ更新（`pypdf`）を選択適用 |
| `1a135f0`, `410408e`, `a01fd5f` | 閉域・二重ホスト向け運用者ログイン、自己ホストフォント、成果物/日程調整公開経路 | 保留（独自認証・プロキシ構造保護） |
| `f1e1676`, `8f6702f` | 主所属と親チームによる配下閲覧（`feat/team-org-primary-affiliation`） | 保留（本環境のLiteLLM/チーム権限構成と衝突回避） |
| `252db54`, `ede98cd`, `661fd1a`, `e4213db`, `774348d`, `454d97e`, `9c51980` | `procuretech-editor`, `procuretech-generate` 関連（PPTX DADS 生成等） | 保留（スタンドアロン外部マイクロサービスは原則非取り込み） |
| `b42e2a7`, `c959ca4` | `fix(backend)`: LLM 応答から reasoning (`reasoning`/`reasoning_content`) を画面に出さない | 選択適用（`_assistant_visible_text` パッチ適用） |

---

## 3. 取り込み・パッチ適用内容 (方針B - 選択的取り込み)

### (1) セキュリティ脆弱性対応 (`pypdf` バージョンアップ)
- `backend/requirements.txt`
- `rag-app/requirements.txt`
- `tests/requirements.txt`
- 上記全環境において `pypdf` を `6.15.0` から `6.16.2` にアップグレードし、CVE-2026-84309, CVE-2026-84310, CVE-2026-84311 を完全解消。

### (2) LLM 応答の思考過程（reasoning）非表示処理 (`b42e2a7`)
- `backend/app/llm.py` 内に `_assistant_visible_text` ヘルパー関数を導入。
- gpt-oss や DeepSeek / Qwen / vLLM 等の推論モデルが出力する `reasoning` および `reasoning_content` フィールドをユーザ向け応答画面に非表示化。
- `tests/test_llm_reasoning.py` を追加し単体テストで正常動作を検証。

---

## 4. 実行検証結果

1. **依存関係セキュリティ監査 (`scripts/audit-python-deps.sh`)**
   - 全 13 の Python requirements.txt スキャンにおいて **既知の脆弱性 0 件** を確認。
2. **バックエンド・フロントエンド回帰テスト (`scripts/run-regression-tests.sh`)**
   - Python テスト (pytest): 109 passed, 4 skipped (100% Pass)
   - Web テスト (Vitest): 12 passed (100% Pass)

---

## 5. 結論

Upstream の最新差分を網羅的に評価し、セキュリティ改善および LLM UX 改善（reasoning 除去）を安全に選択統合しました。LGWAN 閉域網セキュリティ境界および LiteLLM 統合アーキテクチャの健全性が完全に維持されていることを確認しました。
