# Upstream 同期アセスメント・統合評価レポート (2026年9月21日)

## 概要

本レポートは、フォーク元リポジトリ（Upstream: `https://github.com/hirokawaguchi/open-genai`）における最新コミット `0dc47ee`（2026年9月21日時点）までの動向を評価し、当プロジェクト（`chottokun/open-genai`）の方針B（LGWAN閉域ネットワークセキュリティ・LiteLLMプロキシ一元管理優先・高価値パッチの選択的取り込み）に基づく評価・統合結果を記録するものです。

---

## 1. Upstream 差分コミット概要 (全 30 コミット)

前回の評価時点（`3a8fefc` release v0.10.0）以降に Upstream に追加された 30 コミットの要約と評価結果は以下の通りです：

| コミット / PR | 概要 | 当リポジトリにおける評価および対応方針 |
| --- | --- | --- |
| `0dc47ee` / `6c8d408` | `feat(editor)` docx 書き出しをプレビューの見た目に寄せる（フォント・段落サイズ・余白の調整） | 保留（`procuretech-generate-app` マイクロサービス向け改善のため本コアでは除外） |
| `614e134` / `00ab59a` | `feat(tenants)` 棟の管理で棟の名前を変更できるようにする | 保留（特定庁舎・テナント向け管理コンポーネントのため本コアでは除外） |
| `6bfdc65` | `feat(tenants)` 利用者登録で棟を必須にする | 保留（独立Keycloakカスタマイズ依存のため除外） |
| `c75b254` | `feat(tenants)` 履歴とピン留めを活性棟ごとに分ける | 保留（特定庁舎マルチテナント構成依存のため除外） |
| `7279852` | `feat(tenants)` 棟とおすすめアプリの出し分けを追加する | 保留（特定庁舎マルチテナント構成依存のため除外） |
| `856c9ab` | `feat(generate)` Markdown の表や装飾を docx 書き出しに反映する | 保留（`procuretech-generate-app` 専用機能） |
| `a42a576` / `74998d2` | `feat(artifacts)` 成果物配信に Host 判定の auto モードを追加する | **既に統合済み** (`backend/app/artifact_delivery.py` にて適用済み) |
| `a3a3974` / `531eaa4` | `feat(navigator)` 読み込み画面から様式をダウンロードできるようにする | 保留（`procuretech-navigator-app` 専用機能） |
| `d60a454` / `dd83ae0` | `feat(auth)` インターネット入口ログインと庁内公開面の振り分けを追加する | 保留（ネット分離庁内専用ネットワーク構成のため除外） |

---

## 2. セキュリティ脆弱性スキャン・依存ライブラリ更新

`scripts/audit-python-deps.sh` を使用して、全 13 個の `requirements.txt` に対する `pip-audit` 脆弱性スキャンを実施しました。

### 検出された脆弱性とパッチ適用内容

1. **`pypdf` パッケージ**
   - **問題**: `6.15.0` にて CVE-2026-84309, CVE-2026-84310, CVE-2026-84311 が検出されました。
   - **対応**: Upstream と同様に `backend/requirements.txt`, `rag-app/requirements.txt`, `tests/requirements.txt` の `pypdf` を **`6.16.2`** にアップグレードし、脆弱性を完全に解消しました。
   - **検証**: `tests/test_pypdf_upgrade_validation.py` を更新し、バージョンおよび PDF テキスト抽出機能の実働検証を通過。

2. **`accelerate` パッケージ**
   - **問題**: `local-sd-api/requirements.txt` の `1.14.0` にて PYSEC-2026-3804 が検出されました。
   - **対応**: `1.15.0` へアップグレードし、脆弱性を解消しました。

### スキャン結果
- **全 13 requirements ファイルスキャン結果**: **既知の脆弱性 0 件 (No known vulnerabilities found)**

---

## 3. 回帰テスト・品質検証結果

全テストスイートを実行し、動作および品質に影響がないことを検証しました。

### 1. バックエンド Python テスト (`pytest`)
```
command: bash scripts/run-regression-tests.sh
results: 109 passed, 4 skipped in 3.21s (100% SUCCESS)
```

### 2. フロントエンド Web テスト (`Vitest`)
```
command: cd genai-web && npm run web:test
results: 54 test files passed, 631 tests passed (100% SUCCESS)
```

---

## 4. 結論

Upstream `0dc47ee` までの変更点に対するアセスメントを完了しました。
主要なセキュリティ脆弱性（`pypdf` 6.16.2, `accelerate` 1.15.0）に対するパッチ適用を完了し、109 個のバックエンドテストおよび 631 個のフロントエンドテスト全件の正常合格を確認しました。
