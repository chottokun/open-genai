# Upstream Synchronization & Verification Report (v0.3.2)

## 1. 概要 (Executive Summary)

本報告書は、フォーク元リポジトリ（upstream）の更新状況の評価、およびローカル開発ブランチとの同期状態を詳細かつ批判的に検証した結果をまとめたものです。

* **検証対象 Upstream URL**: `https://github.com/hirokawaguchi/open-genai`
* **最新の Upstream リリース/コミット**: `v0.3.2` (コミットID: `1eff6b1`, タグ: `v0.3.2`)
* **検証日**: 2026-07-18

### 結論
ローカル開発ブランチは、すでに Upstream の最新バージョンである `v0.3.2` のすべての機能拡張およびバグ修正を安全にマージ・統合（Sync）済みです。Upstream 側にはこれより新しいコミットやブランチの更新は存在しないため、**新規の取り込み（マージ）は不要**であると判断しました。
また、依存関係の脆弱性スキャンおよびバックエンド・フロントエンドの全リグレッションテストを実行し、すべてが **100% Pass** することを確認しました。

---

## 2. Upstream 更新の評価と整合性検証 (Upstream Status Evaluation)

### ① コミット履歴・タグの検証
Upstream の最新 5 コミットを確認したところ、以下の通り `v0.3.2` のリリースおよび機能マージが最終更新となっています。

```bash
1eff6b1 release: v0.3.2 — 出典表示・ローカルDify成果物取得・Enter送信など
1a9eb42 feat: 出典表示・ローカルDify成果物取得・Enter送信など（#4）
0a98a16 fix: シードアプリ移行時の履歴 teamName をチーム名から取得する
64afc22 feat: 出典表示・ローカルDify成果物取得・Enter送信など（v0.3.2向け）
f8cd351 release: v0.3.1 — 起動手順・CI・添付拡張子判定の修正
```

### ② 実装コードの整合性
ローカル開発ブランチ内の実装を監査し、Upstream `v0.3.2` の主要な機能が正しく実装・保持されていることを個別に確認しました。

1. **RAG / Dify 出典表示 (Citations Accordion)**
   * `genai-web/packages/web/src/features/exapp/components/ExAppCitations.tsx` において、`text/x.open-genai.citation` MIME タイプのアーティファクトを検出し、アコーディオン (`<details>`) で折りたたみ表示するコンポーネントが実装されています。
   * RAG ダウンロード一覧において、citation はファイル成果物から正しく除外されるように `ExAppArtifactDownloads.tsx` でフィルタリングされています。
   * バックエンド（`rag-app/app/main.py`）でも、`CITATION_MIME` のメタデータ生成が動作しています。

2. **ローカル/セルフホスト Dify 向け SSRF ガードの緩和**
   * `shared/ssrfguard.py` 等により、SSRF 対策を維持しつつ、`.env` で設定された `ARTIFACT_FETCH_ALLOWED_HOSTS` に基づくプライベート・ループバック IP（`host.docker.internal` 等）の安全な名前解決が許可される仕様になっています。

3. **入力欄の送信UX (Enter 送信の統一)**
   * テキストエリアにおいて Enter キー押下時に送信を実行し、Shift+Enter で改行する UX が `ChatInput.tsx` および `LandingForm.tsx` に導入されています（IME 変換中の誤送信防止を考慮済み）。

4. **ナレッジ管理の COMMON チーム移設**
   * シードアプリの `teamId` が変更された際に、履歴やピン留めが正しく追随する移行ロジック（`backend/app/teams_store.py` や起動時移行スクリプト）が備わっています。

---

## 3. セキュリティ監査結果 (Security Audit)

既知の脆弱性チェックツール（`pip-audit`）を実行し、プロジェクト全体（計 12 個の `requirements.txt`）の Python 依存ライブラリを精査しました。

* **実行スクリプト**: `scripts/audit-python-deps.sh`
* **対象ファイル**:
  * `./audit-app/requirements.txt`
  * `./backend/requirements.txt`
  * `./dify-app/requirements.txt`
  * `./local-sd-api/requirements.txt`
  * `./local-whisper-api/requirements.txt`
  * `./modelpolicy-app/requirements.txt`
  * `./ngword-app/requirements.txt`
  * `./prompt-app/requirements.txt`
  * `./rag-app/requirements.txt`
  * `./tests/requirements.txt`
  * `./usermgmt-app/requirements.txt`
  * `./whisper-app/requirements.txt`
* **結果**: **既知の脆弱性は検出されませんでした (No known vulnerabilities found)**。過去に検出されていた `setuptools` の脆弱性も安全に対応済みです。

---

## 4. 品質・デグレード検証結果 (Regression Testing)

### ① バックエンド テスト (Python/pytest)
* **テスト件数**: 60件
* **結果**: **100% Pass** (60 passed in 1.13s)
* **検証内容**: セキュリティガード、画像生成（sd-app）フォールバック、音声認識（whisper-app）ガードレールなど、主要なマイクロサービス境界とバックエンドロジックの動作保証を確認。

### ② フロントエンド テスト (TypeScript/Vitest)
* **テスト件数**: 622件 (50テストファイル)
* **結果**: **100% Pass** (622 passed in 39.46s)
* **検証内容**:
  * 引用アコーディオンの開閉インタラクションテスト。
  * `ChatInput` での Enter 送信結合テスト。
  * `useSetDefaultValues` フックの境界値/安全なフォールバックテスト。
  * AI アプリの複製（コピー）における endpoint と apiKey の編集送信フォーム検証。

---

## 5. 総評 (Verdict)

本開発ブランチは、Upstream の最新状態である `v0.3.2` を完全かつ安全に取り込み、独自のローカル特化（ローカル画像生成・音声認識の追加や、コンテナ統合設計）との競合を完全に解決した堅牢な状態を維持しています。

動作保証およびセキュリティ面での懸念も一切検出されず、品質基準を完全に満たしているため、今回の同期・検証ワークフローを正常完了とします。
