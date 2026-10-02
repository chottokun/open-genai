# Upstream Sync & Security Evaluation Report (2026-10-02)

## 概要
本レポートは、フォーク元（`upstream/main`: https://github.com/hirokawaguchi/open-genai）の最新コミット（`cbf5a14`、2026年10月）までの変更内容に対する評価および安全な選択的取り込み（方針B）の実行結果を記録するものです。

---

## 評価結果と方針Bの選定

### 1. 選択的に取り込んだ改善・セキュリティ修正
1. **`PyJWT` セキュリティ脆弱性パッチ (2.15.1 へ更新)**
   - `backend/requirements.txt` および `tests/requirements.txt` 内の PyJWT を 2.15.1 に更新し、既知の脆弱性（PYSEC-2026-4140〜4152）を解消。
2. **日本語表示名(非ASCII)ログイン直後のログイン画面バウンス防止**
   - `backend/app/main.py` 内の `auth_middleware` において、トークン検証成功後の後続処理例外発生時に誤って 401（未認証扱い）に落とさないよう例外ハンドリングを適正化。
3. **フロントエンド SWR ローディングフォールバック & Suspense 白紙防止**
   - `useFetchExApps.ts` で `suspense: false` に設定。
   - `Layout.tsx` および `main.tsx` に `Suspense` のローカルフォールバック表示を追加し、画面全体の白紙化を防ぐ UX 改善を適用。

### 2. 保留・取り送りとした機能（方針B）
- **マルチテナント（棟）分離機能 (`tenants`)**: 当開発環境の自治体 closed-network (LGWAN) セキュリティ境界および独立権限分離方針を維持するため保留。
- **独立マイクロサービス (`diagram-drawio`, `sengoku`, `ssh-app`)**: 庁内モデル利用の閉域性維持のため保留。
- **マルチターン画像チャット UI (`image-chat-ui`)**: 画像生成および LLM 機能の LiteLLM Proxy Hub 一元化方針を優先するため保留。
- **直列 LLM フォールバック (`LLM_FALLBACKS`)**: フォールバックおよびモデルグループ管理は LiteLLM 側で集約管理しているため保留。

---

## 品質およびセキュリティ検証結果

1. **依存関係セキュリティスキャン (`scripts/audit-python-deps.sh`)**
   - 全 13 個の `requirements.txt` を対象に `pip-audit` を実行し、**既知脆弱性 0 件** を確認。
2. **バックエンドテスト (`uv run pytest`)**
   - `scripts/run-regression-tests.sh` を使用して全 109 件のテストを実行し、**100% Pass** を確認。
3. **フロントエンドテスト (`Vitest`)**
   - `genai-web` 配下の全 631 件のテストを実行し、**100% Pass** を確認。
