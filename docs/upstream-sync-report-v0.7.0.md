# Upstream Sync & Architectural Compatibility Report - v0.7.0

本レポートは、公式 Upstream リポジトリ (`https://github.com/hirokawaguchi/open-genai`) の `v0.7.0` アップデートに対する技術評価、ローカルファースト・閉域セキュリティ設計との互換性アセスメント、および実施された脆弱性対応結果をまとめたものです。

---

## 1. Executive Summary

Open GENAI は、デジタル庁「源内」のフォーク元（Upstream）の利便性を取り込みつつ、以下のコア設計原則を維持するローカル完結・セキュリティファースト設計を採用しています：
1. **完全なオフライン/閉域運用**: Ollama、Stable Diffusion、faster-whisper、SeaweedFS等による外部クラウド不依存設計。
2. **LiteLLM Proxy Hub 一元管理**: 画像生成・編集、テキスト生成、音声認識の全推論リクエストを LiteLLM を経由させてポリシー・監査制御する。
3. **堅牢な認可・セキュリティ境界**: unauthenticated `GET` アクセスは `/static/` アセット等最小限に抑え、添付ファイルおよび書き込み操作は厳格な HMAC 署名・JWT 認証で保護する。

Upstream は `v0.7.0` リリースにおいて、以下の主要機能およびセキュリティ強化を追加・改善しました：
- **書類領域分割チェックアプリ (`doccheck-app`)**
- **LGWAN公開面の無認証リスク軽減・添付URLのHMAC署名機能・入口レート制限・起動時秘密情報警告**
- **`.env.bak` の `.gitignore` への追加**
- **Web クライアント (`fileApi.ts`) の復元修正**

当開発ブランチのセキュリティポリシーおよび設計思想に基づき、これらの機能について詳細な評価を行いました。評価の結果、**LGWAN公開面セキュリティリスク軽減（filesig, security_warn, nginx rate limiting）および各種バグ修正・環境整備は個別に cherry-pick / パッチ統合し、新規別コンテナサービス（doccheck-app, chosei-app）や未認証ストリーム処理は取り込み見送り**と判断しました。

---

## 2. Upstream v0.7.0 差分の評価と採用判断

### 2.1 採用（Cherry-pick / パッチ統合）された項目

1. **LGWAN公開面セキュリティリスク軽減（filesig, security_warn, Nginx 設定）**:
   - `backend/app/filesig.py`: 添付ファイル URL に対する短命 HMAC 署名（`exp`, `sig`）機能の導入。
   - `backend/app/security_warn.py`: 起動時に既定秘密情報（`APP_JWT_SECRET`, `INTERNAL_SIGNING_SECRET` 等）が残っている場合の詳細な安全警告表示。
   - `proxy/nginx.conf`: Nginx 入口におけるレート制限 (`limit_req_zone`)、本番配下での OpenAPI ドキュメント遮断 (`/api/docs` 404)、`/kc/admin` 管理画面の IP 制限 (`kc-admin-allow.conf`)。
   - `tests/test_filesig.py`: HMAC 署名およびセキュリティ警告の自動単体テストを追加。
2. **Web クライアントおよびリポジトリ設定のバグ修正**:
   - `genai-web/packages/web/src/lib/fileApi.ts`: `getS3Uri` エクスポートの復元。
   - `.gitignore`: 秘密情報を含みうる `.env.bak` / `*.env.bak` の追跡除外設定。
3. **Dify フォーム／様式 Excel 文書生成・セル書き戻し機能 (`395f36a`)**:
   - `dify-app/app/excel_map.py`: 業務フォーム/様式 Excel のセル（例: `B2`, `C5`）から値を抽出し Dify ワークフローの開始変数へ注入。生成結果を Excel のセルへ書き戻し成果物としてダウンロード配信可能にするロジックを統合。
   - `genai-web/packages/web/src/features/exapp/components/ExAppArtifactDownloads.tsx`: base64 形式の Excel / 文書成果物ダウンロードボタン UI を追加。

### 2.2 非採用（取り込み見送り）と判断された項目

1. **書類領域分割チェックアプリ (`doccheck-app`)**:
   - **理由**: 独立したコンテナサービスを追加することで閉域環境でのリソース消費が増大する点、および当リポジトリでは `shared/docextract.py`（文字コード自動判定・DOCX表抽出・50万字ガード）により安全かつ高速なテキスト抽出が既に完備されているため。
2. **日程調整オプション ExApp (`chosei-app`)**:
   - **理由**: 庁外ゲスト向けの未認証デュアルイングレス設計が、地方自治体・閉域網（LGWAN）のセキュリティ分離原則と反するため。
3. **Dify チャット ストリーミング表示・未認証ストリーム中継**:
   - **理由**: 既存の安定した同期型 Dify exApp 処理（エラー分類・マップリデュース保護）を温存し、回帰バグおよびセキュリティ境界の緩和を防ぐため。

---

## 3. 依存関係セキュリティ監査および回帰テスト結果

* **セキュリティ脆弱性スキャン (`scripts/audit-python-deps.sh`)**:
  - pip-audit を実行し、全 Python パッケージの脆弱性が **0 件（100% CLEAN）** であることを実証。
* **バックエンド回帰テスト (`uv run pytest`)**:
  - `tests/test_filesig.py` を含む全テストスイートで合格。
* **フロントエンド Web テスト (`npm run web:test`)**:
  - 全テストで Pass を確認。

---

## 4. 結論

Upstream `v0.7.0` の微修正・セキュリティ強化（HMAC署名・起動時警告・レート制限・gitignore）を安全に取り込み、閉域網での LGWAN セキュリティ境界および LiteLLM 一元管理ポリシーを維持した堅牢なコードベースを確定しました。
