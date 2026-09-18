# Upstream 同期評価報告書 (v0.10.0 / 2026-09-18)

## 1. 概要
- **対象 Upstream リポジトリ**: `https://github.com/hirokawaguchi/open-genai`
- **最新 Upstream コミット / タグ**: `3a8fefc` (PR #74 merge: release v0.10.0) / `fix/chat-upload-and-name-order` (`8483c15`)
- **評価方針**: **方針B (Policy B: 選択的チェリーピック・パッチ適用)**
  - 閉域網(LGWAN)セキュリティ境界・アーキテクチャ方針 (LiteLLMプロキシ集約・単一認証基盤・SAML等) を最優先保護。
  - 最新 Upstream の微修正・安全な機能/UX改善・依存関係セキュリティ更新を取り込み、独立外部マイクロサービス群（`notebook-app`, `ssh-app` 等）はローカル構成の堅牢性維持のため除外・評価完了とする。

---

## 2. コミット評価・分析

### A. 取込評価・状況
1. **未登録モデルのチャット添付・Keycloak 姓名順整合** (`8483c15` / `upstream/fix/chat-upload-and-name-order`)
   - `useFileUploadable.ts`, `UserCsvSection.tsx`, `kcadmin.py`: 統合済み。
2. **サイレント JWT トークン再発行・送信キー設定・共通アプリ紹介文編集** (`7cfc196`, `50720aa`, `1e1a325`)
   - フロントエンド/認証層に統合・動作検証完了。
3. **Whisper 大容量 64MB Nginx アップロード制限緩和** (`3f4ecf5`)
   - `nginx.conf` に反映・統合済み。

### B. 保留・除外判断 (LGWAN 閉域網セキュリティ保護)
1. **`notebook-app` (ヒアリングシート回収・ノートブック機能)** (`fa018c8`, `428bae4`, `7823567`)
   - 閉域網分離および LiteLLM 統合環境と重複するため、直接マージは行わずローカルアーキテクチャを維持。
2. **`ssh-app` (ブラウザ Web SSH ターミナル機能)** (`87dd5fc`, `778570e`)
   - 閉域網内での任意 SSH 接続機能はセキュリティポリシー上許可されないため除外。

---

## 3. CI/CD 依存関係セキュリティ監査 (pip-audit)

全 13 個の Python `requirements.txt` を対象に `scripts/audit-python-deps.sh` を実行。

- `pypdf`: `6.15.0` → **`6.16.2`** にアップグレード (CVE-2026-84309, CVE-2026-84310, CVE-2026-84311 解消)
- `accelerate`: `1.14.0` → **`1.15.0`** にアップグレード (PYSEC-2026-3804 解消)

**監査結果**: 13 ファイルすべてで **0 vulnerabilities** を確認。

---

## 4. 結論
Upstream v0.10.0 までのすべての更新内容の評価が完了し、本開発ブランチの LGWAN 閉域網方針に適合する機能およびセキュリティアップデートが適用・検証されました。
