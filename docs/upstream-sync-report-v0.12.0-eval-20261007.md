# Upstream (v0.12.0 / `379e840`) 同期アセスメントおよび評価レポート (2026-10-07)

## 概要

本レポートは、公式 Upstream リポジトリ (`https://github.com/hirokawaguchi/open-genai`) の最新リリース `v0.12.0` (コミット `379e840` / 2026年10月時点) に対する評価・取り込み検討結果をまとめたものです。

当開発ブランチでは、閉域網（LGWAN等）運用におけるセキュリティ境界の保護および LiteLLM Proxy による中央集約型アーキテクチャの維持を基本方針（方針 B: 選択的チェリーピック／セキュリティパッチ適用）として採用しています。

---

## 評価結果サマリー

| カテゴリ | アップストリーム内容 / コミット | 当開発ブランチにおける対応方針 | 理由・影響 |
| :--- | :--- | :--- | :--- |
| **セキュリティ依存関係** | `pypdf` 6.19.0 アップグレード (`cef6b9d`), `PyJWT` 2.15.1 アップグレード (`7c89abc`), `accelerate` 1.15.0 | **即時取り込み (チェリーピック適用)** | 既知の脆弱性 (PYSEC-2026-4153, PYSEC-2026-4145, CVE-2026-102275 等) を解消し、0-vulnerability の高安全性を維持するため。 |
| **独立マイクロサービス / 棟 (Tenants) 制御** | 2週間の仕事 (`jigyo` / `nishukan-app`), 図形描画 (`diagram-drawio`), 棟別モデル制御 (`tenants`) | **取り込み保留 (保留・延期)** | 未認証プロキシエンドポイントの露出防止、LGWAN閉域網における単一入口セキュリティ境界の維持、および LiteLLM Proxy 中央管理方針を優先するため。 |
| **独自環境に非互換な機能** | `llm-fallback` (`cbf5a14`), 個別モデル名表示非表示 (`3bd45f7`) | **取り込み見送り (不適用)** | LiteLLM Gateway による中央制御管理とバッティングし、モデル選択の競合を回避するため。 |

---

## 詳細分析と適用方針

### 1. セキュリティパッチの適用 (適用)
- **`pypdf` 6.19.0 への昇格**:
  - `backend/requirements.txt`, `rag-app/requirements.txt`, `tests/requirements.txt` 等の `pypdf` バージョンを `6.19.0` に更新。
  - `PYSEC-2026-4153` などの PDF 読み取り型脆弱性を完全解消。
- **`PyJWT` 2.15.1 への昇格**:
  - `backend/requirements.txt`, `tests/requirements.txt` の `PyJWT` を `2.15.1` に更新。
  - `PYSEC-2026-4145` 等の JWT 検証に関する脆弱性を解消。
- **`accelerate` 1.15.0 への昇格**:
  - `local-sd-api/requirements.txt` の `accelerate` を `1.15.0` に更新。

### 2. マイクロサービス・独自機能の保留 (保留・不適用)
- **`jigyo` (`nishukan-app`) / `diagram-drawio`**:
  - 独自コンテナおよびスタンドアロンサービスを追加する設計であるため、自前環境の依存関係拡張を抑えるべく保留。
- **`llm-fallback`**:
  - Upstream 側のクライアント自動フォールバックは、LiteLLM Gateway 側でのモデルルーティング・フォールバック管理方針と競合するため不適用。

---

## 品質検証・セキュリティ監査結果

1. **`pip-audit` 脆弱性スキャン**:
   - 13 個の Python 依存定義ファイル（`requirements.txt`）において、検出された脆弱性は **0 件**（100% CLEAN）。

2. **回帰テスト（Backend / Frontend）**:
   - `pytest`: 109 テスト全て合格（100% PASSED）。
   - `Vitest` (genai-web): 631 テスト全て合格（100% PASSED）。
