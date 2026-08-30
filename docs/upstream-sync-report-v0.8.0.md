# Upstream Sync & Architectural Compatibility Report - v0.8.0

本レポートは、公式 Upstream リポジトリ (`https://github.com/hirokawaguchi/open-genai`) の `v0.8.0` アップデートに対する技術評価、ローカルファースト・閉域セキュリティ設計との互換性アセスメント、および実施された同期・セキュリティ検証結果をまとめたものです。

---

## 1. Executive Summary

Open GENAI は、デジタル庁「源内」のフォーク元（Upstream）の利便性を取り込みつつ、以下のコア設計原則を維持するローカル完結・セキュリティファースト設計を採用しています：
1. **完全なオフライン/閉域運用**: Ollama、Stable Diffusion、faster-whisper、SeaweedFS等による外部クラウド不依存設計。
2. **LiteLLM Proxy Hub 一元管理**: 画像生成・編集、テキスト生成、音声認識の全推論リクエストを LiteLLM を経由させてポリシー・監査制御する。
3. **堅牢な認可・セキュリティ境界**: 未認証アクセス（unauthenticated GET）は `/static/` アセット等の最小限に抑え、すべての機能操作・更新（POST/PUT/DELETE）は JWT 認証で保護する。

Upstream は最近 `v0.8.0` リリースを公開し、以下の機能・修正が追加されました：
- **提案実装第2弾：オンラインフォーム受付アプリ (`patchform-app`) 一式**
- **Dify チャットのストリーミング中自動スクロール滑らか化 (`2e18c02`)**
- **添付ドキュメント抽出の各種形式対応（.pptx / .xls / .doc OLE 抽出）**
- **`cryptography` のセキュリティ更新 (`50.0.1`)**

当開発ブランチのセキュリティポリシーおよび設計思想に基づき、これらの機能について詳細な評価および選択的取り込み（方針B：Selective Integration）を実施しました。

---

## 2. Upstream v0.8.0 差分の評価と取り込み方針

### 2.1 提案実装第2弾：オンラインフォーム受付アプリ (`patchform-app`)
* **Upstream の設計**:
  * 庁内および庁外の未認証・ゲスト利用者向けオンラインフォーム作成・受付マイ手続き（`patchform-app` / `procedure-mcp` / 匿名共有リンク機能）。
  * 外部からの未認証リクエスト受付（Guest ログイン/セッション/公開フォームアクセス）を行う追加 microservice。
* **評価・判断**: **見送り（保留）**
  * **理由**: 外部（庁外）公開用の未認証エンドポイントやゲストセッション管理は、LGWAN closed-network 閉域運用ポリシーとバウンダリ衝突するため。必要に応じた専用ページ統合等のカスタマイズ方針が固まるまで、本体コアへの導入は見送ります。

### 2.2 Dify チャット ストリーミング中の自動スクロール滑らか化 (`2e18c02`)
* **Upstream の設計**:
  * `ExAppChat.tsx` において、逐次トークン到着ごとの `scrollIntoView` 連打を `requestAnimationFrame` で 1 フレームに間引き、配信中は即時追従・完了時のみ `smooth` スクロールに切り替える改善。
  * ユーザーが上へ読み返している間は追尾を一時停止し、送信直後に追尾を自動再有効化する。
* **評価・判断**: **取り込み完了 (Selective Patch)**
  * UX 向上および描画パフォーマンス改善のため、パッチを適用しました。

### 2.3 添付ドキュメントのテキスト抽出拡張 (`shared/docextract.py`)
* **Upstream の設計**:
  * PDF/Word/Excel に加え、PowerPoint (.pptx)、旧形式 Excel (.xls)、旧形式 Word/PowerPoint (.doc/.ppt OLE 抽出) の抽出処理を追加。
* **評価・判断**: **取り込み完了 (Selective Integration)**
  * RAG およびチャット添付における利便性が大幅に向上するため、`shared/docextract.py` に処理を統合し、`backend/requirements.txt` および `rag-app/requirements.txt` に依存ライブラリ (`python-pptx`, `xlrd`, `olefile`) を追加しました。

---

## 3. 依存関係セキュリティ監査 (`scripts/audit-python-deps.sh`)

全 13 個の `requirements.txt` について `pip-audit` スキャンを実施しました。
* **結果**: **既知の脆弱性 0 件 (100% CLEAN)**

---

## 4. 全体テスト・検証結果

1. **Python バックエンド回帰テスト (pytest)**:
   * `scripts/run-regression-tests.sh` にて `test_docextract.py` の新規テストを含むテストを実行。
   * **110 passed, 4 skipped (100% SUCCESS)**
2. **Web フロントエンド回帰テスト (Vitest)**:
   * `genai-web` にて Vitest 全 54 ファイルを実行。
   * **631 passed (100% SUCCESS)**

---

## 5. 結論

Upstream `v0.8.0` のうち、LGWAN 閉域セキュリティ原則に影響を与えない非破壊的な UX 向上（Dify チャット自動スクロール改善）およびドキュメント抽出拡張 (.pptx/.xls/.doc 対応) を選択的に取り込みました。未認証の外部公開を前提とする `patchform-app` は慎重に見送り、コードベースの堅牢性と 100% のテストパス状態を維持しています。
