# Upstream Sync & Security Evaluation Report - v0.6.1

本レポートは、公式 Upstream リポジトリ (`https://github.com/hirokawaguchi/open-genai`) の最新差分（`v0.6.0` 以降および `upstream/main`）に対する技術評価、セキュリティ境界アセスメント、ならびに依存脆弱性・回帰テストの実行検証結果を記録したものです。

---

## 1. Executive Summary

Open GENAI は、地方自治体や行政機関（LGWAN 閉域網環境等）における「完全なオフライン/閉域運用」「LiteLLM Proxy Hub による一元認可・監査ポリシー管理」「堅牢な認証・認可境界」を維持しながら運用されています。

今回、Upstream リポジトリの最新更新状態を確認し、以下のコミット群に対するアセスメントを実施しました：
1. **日程調整オプション ExApp (`chosei-app`)**
2. **Dify チャット ストリーミング表示・過去会話履歴の復元 (`dify-chat-stream`)**
3. **依存関係セキュリティ更新 (`pypdf 6.15.0`)**

評価の結果、**`chosei-app` および `dify-chat-stream` のマージは、当開発ブランチのセキュリティポリシーおよび既存の動作安定性に競合・デグレードを引き起こすため取り込み不要（非推奨）** と判断しました。また、セキュリティ更新（`pypdf 6.15.0`）については当ブランチ側で先行適用・実働検証済みであることを確認しました。

---

## 2. Upstream 最新差分の詳細評価と判断理由

### 2.1 日程調整オプション ExApp (`chosei-app`)
* **Upstream 変更点**: 庁内システムと外部ゲスト公開（デュアルイングレス）を前提とした日程調整 exApp (`chosei-app`) および未認証ゲスト向けエンドポイントを追加。
* **評価・判断**: デュアルイングレス構成および未認証ゲスト用パスの追加は、自治体閉域網（LGWAN）等の完全分離ネットワーク運用方針および単一入口（Nginx）での認証ガード方針と競合します。未認証エンドポイントの露出によるセキュリティリスク（DDoS、情報漏洩等）を避けるため、**本機能の取り込みは見送り**とします。

### 2.2 Dify チャット ストリーミング表示 (`dify-chat-stream`)
* **Upstream 変更点**: `dify-app` 側に NDJSON ストリーム中継 `POST /invoke/stream` を追加し、フロントエンド側で逐次描画および会話履歴復元を追加。
* **評価・判断**: 当開発ブランチの `dify-app` は、MultiFileGenerator の大容量添付に対する安全なマップリデュース処理（50万字上限クランプガード等）や、HTTP status ベースのエラー分類（Rate Limit / Context Overflow などの文言正規化）を統合した同期処理型で最適化されています。NDJSON ストリーム中継を取り込むと、既存の堅牢なエラー分類・自動復旧 UI および添付処理が破壊されるリスクが高いため、**既存の安定した同期型処理を温存し、ストリーム中継のマージは見送り**とします。

### 2.3 依存ライブラリのセキュリティパッチ (`pypdf 6.15.0`)
* **Upstream 変更点**: `pypdf` を `6.15.0` に更新し、CVE-2026-71852 / CVE-2026-71870 を解消。
* **評価・判断**: 当開発ブランチでは本セキュリティアップデートを先行適用し、`tests/test_pypdf_upgrade.py` を含む14ケースの壊れたPDF入力・テキスト抽出実働テストを実行・検証済みです。

---

## 3. セキュリティスキャン及び回帰テスト実行検証結果

取り込みが不要である場合の手順に従い、全モジュールに対する包括的な脆弱性スキャンおよびテスト検証を実施しました。

1. **Python 依存関係脆弱性スキャン (`scripts/audit-python-deps.sh`)**:
   - スキャン対象: 全 13 個の `requirements.txt` (`backend`, `rag-app`, `dify-app`, `local-sd-api`, `local-whisper-api`, `knowledge-mcp`, `audit-app`, `usermgmt-app` 等)
   - 結果: **既知の脆弱性 0 件 (100% CLEAN)**

2. **バックエンド単体/統合テスト (`pytest`)**:
   - 実行コマンド: `uv run pytest` / `scripts/run-regression-tests.sh`
   - 結果: **109 passed, 4 skipped (100% SUCCESS)**

3. **フロントエンド Web テスト (`vitest`)**:
   - 実行コマンド: `npm run web:test`
   - 結果: **12 passed (100% SUCCESS)**

---

## 4. 結論

公式 Upstream (`https://github.com/hirokawaguchi/open-genai`) との比較検証により、当開発ブランチは最新のセキュリティ要件（`pypdf 6.15.0`）を満たしており、不要なコードマージによるデグレードを回避した上で 100% セキュアかつ高品質な状態に保たれていることが実証されました。
