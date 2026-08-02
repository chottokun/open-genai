# open-genai (OpenGENAI カスタマイズ版)

オープンソースの行政・自治体向け生成AIプラットフォーム「**OpenGENAI (源内 / GenAI)**」を利用・ベースとし、SAML 2.0 / OIDC シングルサインオン、R-Proxy 方式 SSL/TLS 運用、および閉域網向けガバナンス機能の拡張・調整を行ったリポジトリです。

> 💡 **OpenGENAI プロジェクトに関する注記 & 深甚なる感謝**  
> 本リポジトリは、川口ひろあき氏およびコミュニティによって開発・公開されているオープンソースプロジェクト「[OpenGENAI (GenAI / 源内)](https://github.com/hirokawaguchi/open-genai)」の優れたコードベースと先進的なアーキテクチャ基盤を利用・拡張させていただいております。先進的で高品質なプロダクトをオープンソースとして共有してくださっている開発者の川口ひろあき様をはじめ、OpenGENAI コミュニティの皆様に心より深甚なる感謝を申し上げます。

---

## 🏛️ OpenGENAI レイヤについて

本リポジトリにおける **OpenGENAI** とは、Upstream である「**源内 (GenAI)**」の優れた UI / コア機能の上に、自治体・行政・閉域網でのガバナンスおよび実務要件を満たすために構築された**拡張アーキテクチャ・機能レイヤ** (`backend/`, `shared/`, 各種 `exApp`) を指します。

- **認証・認可基盤**: SAML 2.0 / OIDC 動的バインドおよび Keycloak 同梱
- **拡張マイクロサービス (`exApp`) 群**: 監査ログ (`audit-app`)、利用者一括管理 (`usermgmt-app`)、モデルポリシー制御 (`modelpolicy-app`)、プロンプト共有 (`prompt-app`)、NGワード検知 (`ngword-app`) 等
- **データ & ストレージガバナンス**: SeaweedFS (S3互換) への再ホストおよびハイブリッド RAG

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

| サービス名 | コンテナ名 | ポート (ホスト / 内部) | パス / URL | 説明 |
| --- | --- | --- | --- | --- |
| **Nginx Proxy** | `open-genai-proxy` | 80 / 443 | `/` | エントリーポイント (R-Proxy / SSL終端) |
| **Web UI** | `open-genai-web` | 内部 5173 | `/` | フロントエンド UI (Vite / React) |
| **Backend API** | `open-genai-backend` | 内部 8000 | `/api/` | Core API (FastAPI) / 静的アセット `/static/` |
| **Keycloak** | `open-genai-keycloak` | 内部 8080 | `/kc/` | 認証 Identity Provider (SAML / OIDC) |
| **LiteLLM Proxy** | `open-genai-litellm` | 4000 (内部) | `/litellm/`, `/ui/` | Multi-provider LLM / 画像生成プロキシ & Admin UI |
| **RAG App** | `open-genai-rag-app` | 8001 | `/` | ベクトル検索・ドキュメントストア API |
| **Whisper App** | `open-genai-whisper-app` | 8010 | `/` | 音声文字起こし AI アプリプロキシ |
| **Qdrant** | `open-genai-qdrant` | 6333 | `/` | ベクトルデータベース |

---

## 📚 ドキュメント

- **[SSL/TLS 移行 & R-Proxy ガイド](file:///home/nobuhiko/Project/open-genai/docs/ssl-rproxy-guide.md)**: SAML/OIDC の SSL 移行手順、トラブルシューティング、および `kcadm.sh` ロックアウト復旧。
- **[Upstream v0.5.0 同期検証レポート](file:///home/nobuhiko/Project/open-genai/docs/upstream-sync-report-v0.5.0.md)**: 認証堅牢化、SAML ACS/SLS 改善、クエリ高速化の検証結果。
- **[ハイブリッド RAG ガイド](file:///home/nobuhiko/Project/open-genai/docs/hybrid-rag-guide.md)**: 文書検索・SQLite チャンク取得最適化。
- **[CHANGELOG](file:///home/nobuhiko/Project/open-genai/CHANGELOG.md)**: バージョン変更履歴。

---

## 🙏 謝辞 (Acknowledgements)

本リポジトリは、川口ひろあき様（[@hirokawaguchi](https://github.com/hirokawaguchi)）およびオープンソースコミュニティが公開・推進されている **[OpenGENAI (源内 / GenAI)](https://github.com/hirokawaguchi/open-genai)** プロジェクトの素晴らしくかつ先進的な基盤成果物を利用させていただいたものです。

地方自治体や行政・閉域環境における生成AI活用の未来を切り拓く OpenGENAI プロジェクトの貴重な開発成果および継続的な知識共有に対し、開発者の川口ひろあき様ならびにオープンソースコミュニティの皆様に心より深甚なる謝辞と敬意を表します。

---

## 📄 ライセンス

本プロジェクトは [LICENSE](file:///home/nobuhiko/Project/open-genai/LICENSE) の配下で公開されています。
