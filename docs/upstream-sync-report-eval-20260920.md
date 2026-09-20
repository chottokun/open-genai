# Upstream 同期評価報告書 (2026-09-20)

## 概要

Upstream リポジトリ (`https://github.com/hirokawaguchi/open-genai`) の最新コミット（`3a8fefc` 以降 `856c9ab` まで、計 6 コミット）について評価および機能取り込みの検討を実施しました。

## Upstream 評価詳細 (コミット `3a8fefc`..`856c9ab`)

| コミット | 概要 | 評価・対応方針 |
| --- | --- | --- |
| `dd83ae0` / `d60a454` | feat(auth): インターネット入口ログインと庁内公開面の振り分けを追加 | **見送り (Deferred)**: 当ローカルシステムは自立型 LiteLLM プロキシ構成および閉域網/SAML を基本とし、マルチポータル分離構成への依存を避けるため。 |
| `531eaa4` / `a3a3974` | feat(navigator): 読み込み画面から様式をダウンロードできるようにする | **見送り (Deferred)**: 特定 microservice (`procuretech-navigator-app`) 向け機能のため。 |
| `74998d2` / `a42a576` | feat(artifacts): 成果物配信に Host 判定の auto モードを追加する | **選択的取り込み (Integrated)**: LGWAN 配信自動判定ロジック `artifact_delivery.py` をチェリーピック・統合。 |
| `856c9ab` | feat(generate): Markdown の表や装飾を docx 書き出しに反映する | **見送り (Deferred)**: 特定 microservice (`procuretech-generate-app`) 向け機能のため。 |

## 今回取り込んだ機能・修正

1. **成果物配信における FQDN 自動判定 (`auto` モード) の導入**
   - `backend/app/artifact_delivery.py` の追加および `backend/app/main.py` への組み込み。
   - HTTP リクエストの Host Header (`*.lgwan.jp`) に応じて成果物の直接リンク (`open`) とリンクファイル化 (`carrier`) を自動切り替え。
   - ユニットテスト (`tests/test_artifact_delivery.py`) を配備。

2. **依存ライブラリのセキュリティ脆弱性解消**
   - `pypdf`: `6.15.0` -> `6.16.2` (`backend`, `rag-app`, `tests`) (CVE-2026-84309, CVE-2026-84310, CVE-2026-84311 対策)
   - `accelerate`: `1.14.0` -> `1.15.0` (`local-sd-api`) (PYSEC-2026-3804 対策)

## テスト・検証結果

- **セキュリティ監査**: `scripts/audit-python-deps.sh` 実行により 13 要求ファイル全てで検出件数 0 件を確認。
- **バックエンドテスト**: 全 pytest テストがパス。
