# Upstream v0.7.0 同期評価・セキュリティ検証レポート

## 1. 概要
Upstream リポジトリ (`https://github.com/hirokawaguchi/open-genai`) の最新コミットおよびリリース `v0.7.0` (コミット `1d4d597`) までの評価を実施しました。

本プロジェクトの標準同期プロトコルおよび「方針B（LGWAN閉域網・ローカルファースト最優先、Selective Cherry-Pick/Patching）」に基づき、最新コードベースの整合性、依存関係のセキュリティ脆弱性、およびバックエンド・フロントエンドの回帰テストを徹底検証しました。

---

## 2. Upstream v0.7.0 変更点の評価・取り込み状況

| 機能 / 修正項目 | Upstream コミット | 評価結果 / 採用方針 | ステータス |
|---|---|---|---|
| **pypdf 6.15.0 セキュリティ更新** | `5cf5be2` / `d7ae61e` | CVE-2026-71852 / CVE-2026-71870 解消のため全サービスで取り込み | **適用・検証完了** |
| **Dify フォーム/様式 Excel 文書生成** | `395f36a` | `openpyxl==3.1.5` およびセル書き戻しロジック (`excel_map.py`, `ExAppArtifactDownloads.tsx`) を選択適用 | **適用・検証完了** |
| **LGWANセキュリティ強化 (`filesig.py`)** | `a835b07` | HMAC署名付き添付ファイルURL生成・検証機能をバックエンドへ適用 | **適用・検証完了** |
| **起動時セキュリティ警告 (`security_warn.py`)** | `a835b07` | 既定シークレットキー使用時のスタートアップ警告ロジックの統合 | **適用・検証完了** |
| **ナレッジ/添付 PII 検知警告** | `3fe82f1` / `98e8ecc` | 個人情報検知ロジックのローカル評価完了 (GiNZA/spaCy依存は自前実装と保護方針を維持) | **評価完了 (見送り)** |
| **Doccheck (書類領域分割チェックアプリ)** | `357b3da` / `a72c8c7` / `d7ae61e` | 外部OCR依存および別アプリ構成のため、本コア基盤では見送り (独自機能保護) | **非推奨 (見送り)** |
| **Chosei (日程調整アプリ)** | `ddafcc8` | 公開エンドポイントおよび非認証アクセスを伴うためLGWAN境界保護により見送り | **非推奨 (見送り)** |
| **Dify チャット ストリーミング表示** | `5256583` | 未認証ストリームエンドポイント露出によるセキュリティリスク防止のため非同期/同期LiteLLMプロキシ標準化を継続 | **非推奨 (見送り)** |

---

## 3. セキュリティ脆弱性監査 (pip-audit)

`scripts/audit-python-deps.sh` による全13個の `requirements.txt` の脆弱性スキャン結果:

- **Audit 対象ファイル**:
  1. `./audit-app/requirements.txt`
  2. `./backend/requirements.txt`
  3. `./dify-app/requirements.txt`
  4. `./knowledge-mcp/requirements.txt`
  5. `./local-sd-api/requirements.txt`
  6. `./local-whisper-api/requirements.txt`
  7. `./modelpolicy-app/requirements.txt`
  8. `./ngword-app/requirements.txt`
  9. `./prompt-app/requirements.txt`
  10. `./rag-app/requirements.txt`
  11. `./tests/requirements.txt`
  12. `./usermgmt-app/requirements.txt`
  13. `./whisper-app/requirements.txt`

- **結果**: **0 High / 0 Critical (既知の脆弱性は検出されませんでした)**

---

## 4. 回帰テスト検証結果

### バックエンド (Python pytest)
- **コマンド**: `bash scripts/run-regression-tests.sh`
- **結果**: **109 passed, 4 skipped in 4.42s** (100% 成功)

### フロントエンド (Vitest)
- **コマンド**: `npm --prefix genai-web/packages/web run test`
- **結果**: **631 passed (45 test files)** (100% 成功)

---

## 5. 結論
Upstream v0.7.0 の評価および必要な修正の取り込みが完了しており、追加で直ちにマージすべき upstream コミットは存在しません。全セキュリティ監査および単体・統合テストをパスしており、現行ブランチ (`sync-upstream-v0.7.0`) は本番適用可能な状態です。
