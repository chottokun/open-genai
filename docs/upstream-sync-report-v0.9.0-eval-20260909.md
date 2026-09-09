# Upstream 同期評価・適用レポート (2026-09-09)

## 概要
本レポートは、フォーク元リポジトリ `https://github.com/hirokawaguchi/open-genai` の最新コミット（コミット `31978fb` まで）に対する同期評価およびセキュリティ監査の結果をまとめたものです。

本プロジェクトの同期方針 **「方針B（機能・セキュリティの選択的取り込みと独自セキュリティ境界の保護）」** に従い、機能評価とセキュリティチェックを実施しました。

---

## 1. Upstream 差分評価概要

| コミット SHA | コミットメッセージ / 内容 | 評価 | 判定理由・対応内容 |
| :--- | :--- | :--- | :--- |
| `b42e2a7` | `fix(backend): LLM 応答から reasoning を画面に出さない` | **採用** | gpt-oss や DeepSeek R1 などの思考プロセス (`reasoning`, `reasoning_content`) が画面出力に混入するのを防止。`backend/app/llm.py` へ適用し、`tests/test_llm_reasoning.py` を追加。 |
| `pypdf` アップグレード | `CVE-2026-84309`, `CVE-2026-84310`, `CVE-2026-84311` の脆弱性解消 | **採用** | `pypdf` を `6.16.2` へ更新し、セキュリティ依存を最新化。 |
| `9c51980` | `fix(web): CompositionEditor の未使用 mutateProject を削除する` | 保留/対象外 | 本ローカル環境の ProcureTech エディタ構成とは独立しているため保留。 |
| `4aaa1e6` | `feat(auth): 前面プロキシ出口 IP からは運用者フォームを出さず SAML にする` | 保留/評価 | 本環境の SAML / Keycloak 構成に影響を与えないよう既存の認証設定を維持。 |
| `66289b4` | `feat(procuretech-hearing): ヒアリングシートから文書生成できるようにする` | 保留 | 自治体閉域網（LGWAN）内の独立運用境界および認証ガバナンス方針に基づき、procuretech 系独立サービスの導入は見送り。 |
| `31978fb` | `feat(generate): html/pptx を同じデッキ計画にし、Markdown 表をネイティブ表にする` | 保留 | 同上。 |

---

## 2. セキュリティ監査結果 (`scripts/audit-python-deps.sh`)

- **pypdf 脆弱性対応**: `6.15.0` から `6.16.2` へのアップデートを実施し、`CVE-2026-84309`, `CVE-2026-84310`, `CVE-2026-84311` を解消。
- 13 個の Python リクエスト要件ファイルに対して依存関係監査を実施し、100% 承認済み状態であることを確認。

---

## 3. 回帰テスト検証

`bash scripts/run-regression-tests.sh` による全体回帰テストを実行し、以下の結果を得ました:

- **Backend (pytest)**: 110 passed, 4 skipped (100% Pass)
- **Frontend (Vitest)**: 4 passed, 12 tests passed (100% Pass)
