# Open GENAI

行政・閉域環境向けに最適化された、多機能かつ拡張性に優れたローカル・オンプレミス型 LLM / Generative AI アプリケーションプラットフォーム。

---

## 🌟 主な特徴

- **認証 & SSO 統合 (SAML 2.0 / OIDC)**: Keycloak を同梱し、単一サインオン (SSO) および SAML ACS/SLS 動的バインドに対応。
- **リバースプロキシ (R-Proxy) 方式の柔軟な HTTP / HTTPS 運用**: Nginx による HTTP (80) および HTTPS (443) の同時受領と SSL 終端、動的プロキシヘッダー (`X-Forwarded-Proto` / `X-Forwarded-Port`) の解決。
- **ハイブリッド RAG & ナレッジ検索**: SQLite ベクトルインデックス・チャンクバッチ最適化・Qdrant / SeaweedFS 連携による高度な文書検索。
- **柔軟な LLM & 画像生成統合**: LiteLLM プロキシを介したマルチモデル（Gemini, OpenAI, Ollama, Sakura 等）対応およびバックエンド直結型画像生成。
- **文字起こし (Whisper) & マイクロサービス群**: 音声認識、モデルポリシー、NGワード検知、監査ログなどのマイクロサービス統合。

---

## 🚀 クイックスタート

### 1. 前提条件
- Docker & Docker Compose (v2 以上)
- Python 3.12+ (仮想環境・パッケージ管理には `uv` を推奨)

### 2. 環境変数の設定
ルートディレクトリの `.env.example` をコピーして `.env` を作成します。

```bash
cp .env.example .env
```

`PUBLIC_URL` にブラウザでアクセスする公開ホスト名（例: `http://your-domain.local` または `https://your-domain.local`）を設定します。

```bash
# .env
PUBLIC_URL=http://your-domain.local
```

### 3. コンテナの起動 (HTTP デフォルトモード)

```bash
docker compose up -d
```

起動後、ブラウザからアクセスします:
- **Web UI 入口**: `http://your-domain.local/` (または `http://localhost/`)
- **標準初期ログイン**:
  - **ユーザー名**: `admin`
  - **パスワード**: `password`

---

## 🔒 ワンタッチ HTTPS (SSL/TLS) 有効化

閉域網や検証環境でリバースプロキシ方式 (R-Proxy) による HTTPS アクセスを行う場合、自動化スクリプトで一発適用できます。

```bash
# ドメイン名を指定して HTTPS をセットアップ (例: your-domain.local)
bash scripts/setup-rproxy-ssl.sh your-domain.local
```

スクリプトが以下の処理を全自動で行います:
1. 指定ドメイン用自己署名証明書 (`proxy/certs/fullchain.pem`, `privkey.pem`) の生成
2. `docker-compose.yml` を SSL 用 Nginx マウント (`/proxy/nginx.conf` & `./proxy/certs`) と ポート `443` バインドに更新
3. `.env` の `PUBLIC_URL` を `https://your-domain.local` に更新
4. リバースプロキシ・Keycloak・バックエンドを自動再起動

詳細なトラブルシューティングや注意点については [docs/ssl-rproxy-guide.md](file:///home/nobuhiko/Project/open-genai/docs/ssl-rproxy-guide.md) をご参照ください。

---

## 🛠️ 主なサービス構成とポート

| サービス名 | コンテナ名 | ポート (ホスト) | 説明 |
| --- | --- | --- | --- |
| **Nginx Proxy** | `open-genai-proxy` | 80 / 443 | 唯一の公開エントリーポイント (HTTP/HTTPS R-Proxy) |
| **Web UI** | `open-genai-web` | 内部 5173 | フロントエンド UI (Vite / React) |
| **Backend API** | `open-genai-backend` | 内部 8000 | Core API (FastAPI) |
| **Keycloak** | `open-genai-keycloak` | 内部 8080 | 認証 Identity Provider (SAML / OIDC) |
| **LiteLLM Proxy** | `open-genai-litellm` | 4000 | Multi-provider LLM プロキシ |
| **RAG App** | `open-genai-rag-app` | 8001 | ベクトル検索・ドキュメントストア API |
| **Whisper App** | `open-genai-whisper-app` | 8010 | 音声文字起こし AI アプリプロキシ |
| **Qdrant** | `open-genai-qdrant` | 6333 | ベクトルデータベース |

---

## 📚 ドキュメント

- **[SSL/TLS 移行 & R-Proxy ガイド](file:///home/nobuhiko/Project/open-genai/docs/ssl-rproxy-guide.md)**: SAML/OIDC の SSL 移行手順、トラブルシューティング、および `kcadm.sh` ロックアウト復旧。
- **[Upstream v0.5.0 同期検証レポート](file:///home/nobuhiko/Project/open-genai/docs/upstream-sync-report-v0.5.0.md)**: 認証堅牢化、SAML ACS/SLS 改善、クエリ高速化の検証結果。
- **[ハイブリッド RAG ガイド](file:///home/nobuhiko/Project/open-genai/docs/hybrid-rag-guide.md)**: 文書検索・SQLite チャンク取得最適化。
- **[CHANGELOG](file:///home/nobuhiko/Project/open-genai/CHANGELOG.md)**: バージョン変更履歴。

---

## 📄 ライセンス

本プロジェクトは [LICENSE](file:///home/nobuhiko/Project/open-genai/LICENSE) の配下で公開されています。
