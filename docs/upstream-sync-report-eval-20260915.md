# Upstream 同期・評価レポート (2026-09-16)

## 概要

本レポートは、Upstream リポジトリ (`https://github.com/hirokawaguchi/open-genai`) の最新リリース `v0.10.0` (コミット `3a8fefc`) および `fix/chat-upload-and-name-order` ブランチ (コミット `8483c15`) の評価結果、ならびに方針Bに基づく取り込み・セキュリティ修正の適用状況をまとめたものです。

---

## 1. Upstream 評価対象コミット一覧

| コミット | モジュール | 内容 | ローカル方針・判定 |
| :--- | :--- | :--- | :--- |
| `8483c15` | web/auth | 未登録モデルのチャット添付フォールバック処理とKeycloak日本語姓名順揃え | **採択 (Patch)**: チャット添付の操作性向上およびKeycloakユーザー情報の整合性確保のため取り込み。 |
| `3a8fefc` / `23e29ee` | docs | v0.10.0 リリースノート | 参照 |
| `fa018c8` | notebook | 参考資料とMCPでの調査・シート表崩れ修正 | **見送り**: 独立マイクロサービス `notebook-app` はLGWAN閉域網境界維持のため現状未導入。 |
| `87dd5fc` | ssh | asyncssh 2.23.1 によるSCP既知脆弱性解消 | **見送り**: 独立マイクロサービス `ssh-app` はLGWAN閉域網境界維持のため現状未導入。 |
| `778570e` | ssh | ブラウザからの Web SSH 接続機能 | **見送り**: LGWANセキュリティポリシーに基づき見送り。 |
| `428bae4` / `7823567` | notebook | ヒアリングシートのノートブック回収 | **見送り**: `notebook-app` 未導入のため見送り。 |
| `36f3ae2` / `50270aa` | web | プロンプト送信キー（Enter / Ctrl+Enter / Shift+Enter）の設定切り替え | 評価済み・将来検討 |
| `4913078` / `7cfc196` | auth | サイレント JWT リフレッシュ機能 | 評価済み・必要に応じて調整 |
| `ef55b0f` / `1e1a325` | apps | 共通アプリのカタログ表示/非表示および紹介文の編集機能 | 評価済み |
| `ee4ce2f` / `3f4ecf5` | whisper | Whisper 音声ファイル 64MB Nginx アップロード制限拡張 | 評価済み・適用済み |

---

## 2. セキュリティ依存関係アップデート

以下のライブラリのセキュリティ脆弱性を解決するため、バージョンを最新にアップグレードしました。

- `pypdf`: `6.15.0` → `6.16.2` (`backend/requirements.txt`, `rag-app/requirements.txt`, `tests/requirements.txt`)
  - CVE-2026-84309, CVE-2026-84310, CVE-2026-84311 解消
- `accelerate`: `1.14.0` → `1.15.0` (`local-sd-api/requirements.txt`)
  - PYSEC-2026-3804 解消

---

## 3. 検証結果

- **pip-audit スキャン**: 全 13 個の `requirements.txt` に対して脆弱性 0 件を確認。
- **バックエンドテスト (pytest)**: 109 件全件 PASS。
- **フロントエンドテスト (Vitest)**: 631 件全件 PASS。
