# Upstream v0.9.0 後続コミット同期・評価レポート (2026年9月8日)

## 概要

本レポートは、フォーク元リポジトリ (`upstream/main`: `https://github.com/hirokawaguchi/open-genai`) におけるコミット `2f1dc29` (v0.9.0 リリース) 以降から最新コミット `31978fb` までの変更を評価し、方針B（選択的取り込みと独立性維持）に基づいた同期・検証結果をまとめたものです。

---

## コミット評価と取り込み判定一覧

| コミット SHA | コミット概要 / 機能 | 評価・対応 | 判定結果 |
|---|---|---|---|
| `b42e2a7` | fix(backend): LLM 応答から reasoning を画面に出さない | gpt-oss 等のモデルが出力する思考過程 (`reasoning`, `reasoning_content`) を `/predict` 共通応答で隠蔽する。 | **採用 (チェリーピック適用)** (`backend/app/llm.py` および `tests/test_llm_reasoning.py` へ適用) |
| `4aaa1e6` / `df5a413` | feat(auth): 前面プロキシ出口 IP からは運用者フォームを出さず SAML にする | 運用者 FQDN へのアクセスでもプロキシ出口 IP によって認証経路を変更する機能。 | **見送り** (ローカル環境・閉域網における明確な認証分離ポリシーと整合させるため保留) |
| `f1e1676` / `8f6702f` | feat(teams): 主所属と親チームによる配下閲覧を追加 | 組織チーム階層に基づく権限制御。 | **見送り** (LGWAN閉域網における自組織の役割ベース認証ポリシーとの整合性を保つため保留) |
| `ede98cd` 〜 `31978fb` | `procuretech-editor`, `procuretech-hearing`, `procuretech-generate` マイクロサービス群の実装・拡張 | 独立文書作成・ヒアリング・プレゼン生成などの新規マイクロサービス。 | **見送り** (LGWAN閉域網セキュリティ境界の保護および不要なポート・マイクロサービス増加を避けるため、既存の LiteLLM / 源内基本インターフェースへ集約) |

---

## 独自セキュリティ強化・品質維持措置

1. **`pypdf` 依存パッケージの 6.16.2 へのアップデート:**
   - 依存関係の脆弱性スキャン (`pip-audit`) により検出された `pypdf 6.15.0` の既知脆弱性 (CVE-2026-84309, CVE-2026-84310, CVE-2026-84311) に対し、最新の安全バージョン `6.16.2` へ更新 (`backend`, `rag-app`, `tests`)。
   - `scripts/audit-python-deps.sh` スキャンにて 13 個の requirements ファイル全件で **脆弱性 0 件** を確認。

2. **LLM Reasoning 隠蔽の回帰テスト追加:**
   - `tests/test_llm_reasoning.py` を作成し、思考プロセスの非表示制御を検証。

3. **リグレッションテストの全件通過:**
   - バックエンド Python テスト: 110 件 Pass (4 件 skipped = local-whisper 期待通り)
   - フロントエンド Web テスト: Pass
