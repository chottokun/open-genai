# Upstream (v0.11.0 / commit a81744f) 同期・評価レポート

**実施日**: 2026年9月24日
**評価対象**: `upstream/main` (`aeab167` .. `a81744f` / Release `v0.11.0`)

---

## 1. 概要

フォーク元リポジトリ（`hirokawaguchi/open-genai`）にてリリースされた `v0.11.0` およびコミット群（`a81744f` まで）の差分評価を実施しました。

本プロジェクトの基本開発方針である**Policy B（方針B: 自庁仕様優先・LGWAN閉域網境界の保護・LiteLLMプロキシの一元管理）**に基づき、各変更項目の取り込み適否を審査しました。

---

## 2. Upstream 変更点と評価結果

| Upstream コミット / PR | 内容 | 評価 | 理由・対応 |
| :--- | :--- | :--- | :--- |
| **861eab2** (PR #89) | `feat(whisper)`: 文字起こしで音声・動画の対応形式を案内（PyAV / faster-whisper） | **採択** (Patch) | ユーザビリティを向上させる安全な改善。UI案内および対応拡張子定義を本番コードへ適用。 |
| **c57988a** (PR #88) | `fix`: Markdown エディタの使い方をタブ横にし、管理者はデフォルト棟ナレッジを表示 | **見送り** | 当プロジェクトでは専用マイクロサービス (`procuretech-editor`) は分離除外済みのため不要。 |
| **d363113**, **264d199**, **5acc2ac** (PR #83, #84) | `feat(pptx)`: PPTX 題名・DADSレイアウト・Mermaid高解像度PNG配置 | **見送り** | `procuretech-generate-app` に依存するスタンドアロン機能のため見送り。 |
| **813421b**, **6da8307** (PR #90, #91) | `docs`: v0.11.0 リリース文言（棟・マルチテナント表記） | **見送り** | Upstream 固有のマルチテナント用語改定のためローカルでは適用不要。 |
| **ceb0eb7**, **8f7921a** | `fix/feat`: `GET /teams` 応答型修正および棟未指定時のエラー処理 | **見送り** | 当プロジェクトで非採用としているマルチテナント (`tenants`) モジュールに関連するため見送り。 |
| **a6a4a97** (PR #92) | `feat`: 利用者一括管理におけるメールアドレス変更不可制御 | **見送り** | Keycloak一括管理マイクロサービス (`usermgmt-app`) の Upstream 独自拡張のため見送り。 |

---

## 3. 適用した変更とセキュリティ対策

### (1) Whisper 音声・動画フォーマット案内改善の取り込み
- `backend/app/main.py`: Whisper AI アプリの種別シード（`WHISPER_SEED`）に PyAV / faster-whisper が対応する音声・動画形式（.mp3, .wav, .m4a, .flac, .mp4, .webm, .mkv, .mov, .avi 等）の案内表を追加。
- `genai-web/packages/web/src/features/exapp/utils/formatAcceptTypes.ts`: 拡張子ラベル（.wma, .aiff, .amr）を追加。
- `whisper-app/app/main.py`: 未添付時のエラーメッセージを「音声または動画ファイルが添付されていません」へ更新。
- `CHANGELOG.md`: `[Unreleased]` セクションに変更内容を明記。

### (2) 依存パッケージのセキュリティ脆弱性解消 (CVE Patches)
- `pypdf`: `6.15.0` から **`6.16.2`** へアップグレード（`backend`, `rag-app`, `tests`）。
  - 対象 CVE: `CVE-2026-3910`, `CVE-2026-3911`, `CVE-2026-3913`
- `accelerate`: `1.14.0` から **`1.15.0`** へアップグレード（`local-sd-api`）。
  - 対象 CVE: `PYSEC-2026-3804`
- `scripts/audit-python-deps.sh` を実行し、全13個の `requirements.txt` において**脆弱性 0 件 (No known vulnerabilities found)** であることを実証。

---

## 4. 回帰テスト・品質検証

1. **Python バックエンド テスト (`scripts/run-regression-tests.sh`)**:
   - 全 109 件の pytest テストケースを実行し、**100% Pass** を確認。
2. **フロントエンド テスト (Vitest)**:
   - 全 12 件の Vitest コンポーネント/フックテストを実行し、**100% Pass** を確認。
3. **セキュリティスキャン (`scripts/audit-python-deps.sh`)**:
   - 13 ファイルのスキャンで **脆弱性 0 件** を達成。

---

## 5. 結論

Upstream `v0.11.0` の評価を完了し、安全性およびユーザビリティに寄与する Whisper 機能の選択的取り込みと依存パッケージのセキュリティ脆弱性修復を実施しました。
コードベースは健全であり、回帰テストもすべて合格しています。
