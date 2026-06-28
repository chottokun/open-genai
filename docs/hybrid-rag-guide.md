# 🌐 ハイブリッド RAG 構成・導入ガイド

本ガイドでは、**「チャット推論はクラウド LLM（Google Gemini 等）を利用し、埋め込み（Embedding）はローカル環境（`embedding_jp_api` を使用した日本語特化モデル `ruri-v3`）で行う」** という、コスト・セキュリティ・精度をすべて両立した最強のハイブリッド環境の構築・設定方法について解説します。

---

## 🗺️ 全体アーキテクチャ

LiteLLM Proxy をハブ（OpenAI 互換サーバー）として配置し、モデル名に基づいてクラウドとローカルへリクエストをルーティングします。

```mermaid
graph TD
    User([ユーザー]) -->|ブラウザ| Web[genai-web Vite:5173]
    Web -->|API| Backend[backend FastAPI:8000]
    Backend -->|LLMリクエスト| LiteLLM[LiteLLM Proxy :4000]
    
    subgraph RAG アプリ構成
        Backend -->|RAGリクエスト| RAG[rag-app :8001]
        RAG -->|Embeddingリクエスト| LiteLLM
        RAG -->|ベクトル検索| Qdrant[(Qdrant :6333)]
    end

    subgraph 接続先ルーティング
        LiteLLM -->|チャット推論 / RAG生成| Gemini[Google Gemini / Azure OpenAI (クラウド)]
        LiteLLM -->|埋め込み| EmbeddingAPI[embedding_jp_api :8020/8000]
        EmbeddingAPI -->|ローカル処理| Ruri[clari-lab/ruri-v3-base (ローカル)]
    end
```

---

## ✨ この構成が優れている理由

1. **セキュアかつ高速なローカル Embedding**:
   社内文書や行政文書のベクトル化（Embedding）は、すべてローカルコンテナ側で `ruri-v3` を使って安全に行われます。これにより、クラウドへの情報漏洩リスクを抑えつつ、トークン課金の心配をせずに大量の文書をインデックス化できます。
2. **長文コンテキストと高度な推論のクラウド丸投げ**:
   検索されたコンテキストを考慮した高度な回答生成は、圧倒的なコンテキスト制限と推論能力を持つ Google Gemini や Azure OpenAI などのクラウドに任せることで、実用上最も優れた役割分担が成立します。
3. **日本語に特化した RAG 精度**:
   Ollama で特定の日本語 Embedding モデル（特に非対称検索用のプレフィックス指定が必要なモデル）を動作させるには Modelfile の定義などの手間が発生しますが、`embedding_jp_api` を使用することで、最初から日本語に最適化されたモデルを容易に導入できます。

---

## 🛠️ 設定手順

### 1. `litellm_config.yaml` の定義
プロジェクトルートに `litellm_config.yaml` を配置し、モデルごとに接続先をルーティングします。

```yaml
model_list:
  # --- チャット・推論モデル（クラウド） ---
  - model_name: gemini-1.5-pro
    litellm_params:
      model: gemini/gemini-1.5-pro
      api_key: "os.environ/GEMINI_API_KEY"

  - model_name: gemini-1.5-flash
    litellm_params:
      model: gemini/gemini-1.5-flash
      api_key: "os.environ/GEMINI_API_KEY"

  # --- 日本語Embeddingモデル（embedding_jp_api へのルーティング） ---
  - model_name: ruri-base
    litellm_params:
      model: openai/clari-lab/ruri-v3-base
      api_base: "http://embedding-jp-api:8000/v1" # コンテナ間通信URL
      api_key: "not-needed"
```

### 2. `.env` の設定
プロジェクトルートの `.env` ファイルに、必要なキーとプレフィックスの設定を追加します。

```bash
# --- クラウド API 設定 ---
GEMINI_API_KEY=AIzaSy... # ご自身のAPIキーを設定してください

# --- RAG 連携設定 ---
EMBED_MODEL=ruri-base
RAG_MODEL=gemini-1.5-pro

# --- 日本語特化型 Embedding (ruri-v3) 用のプレフィックス設定 ---
# ruri-v3 では、検索クエリと文書でそれぞれ異なるプレフィックスを付与することで精度を最大化します。
EMBED_QUERY_PREFIX=検索クエリ: 
EMBED_DOC_PREFIX=検索文書: 
```

### 3. `docker-compose.yml` でのコンテナ連携
`docker-compose.yml` に `litellm` および `embedding-jp-api` サービスを追加し、`backend` と `rag-app` からの接続先環境変数を LiteLLM Proxy へ向けます。

```yaml
services:
  # 既存のバックエンド等を LiteLLM に向ける
  backend:
    environment:
      - OPENAI_BASE_URL=http://litellm:4000/v1
      - OPENAI_API_KEY=not-needed
      - DEFAULT_MODEL=gemini-1.5-pro
    depends_on:
      - litellm
      # ...

  rag-app:
    environment:
      - OPENAI_BASE_URL=http://litellm:4000/v1
      - OPENAI_API_KEY=not-needed
      - EMBED_MODEL=ruri-base
      - RAG_MODEL=gemini-1.5-pro
      - EMBED_QUERY_PREFIX=${EMBED_QUERY_PREFIX:-検索クエリ: }
      - EMBED_DOC_PREFIX=${EMBED_DOC_PREFIX:-検索文書: }
    depends_on:
      - litellm
      # ...

  # --- 【追加】LiteLLM Proxy ---
  litellm:
    image: ghcr.io/berriai/litellm:main-v1.40.0-stable
    container_name: open-genai-litellm
    ports:
      - "4000:4000"
    volumes:
      - ./litellm_config.yaml:/app/config.yaml
    command: [ "--config", "/app/config.yaml", "--port", "4000" ]
    environment:
      - GEMINI_API_KEY=${GEMINI_API_KEY}
    restart: unless-stopped

  # --- 【追加】日本語特化Embedding API ---
  embedding-jp-api:
    image: ghcr.io/chottokun/embedding_jp_api:latest
    container_name: open-genai-embedding-jp-api
    ports:
      - "8020:8000"
    environment:
      - MODEL_NAME=${EMBED_MODEL_NAME:-clari-lab/ruri-v3-base}
    volumes:
      - huggingface_cache:/root/.cache/huggingface
    restart: unless-stopped

volumes:
  huggingface_cache:
```

---

## 🏃‍♂️ 起動と動作確認

1. **コンテナの起動**:
   ```bash
   docker compose up -d --build
   ```
   初回起動時、`embedding-jp-api` が指定された Embedding モデル（`clari-lab/ruri-v3-base`）を Hugging Face から自動ダウンロードします。これには数分かかる場合があります（ダウンロードされたモデルは `huggingface_cache` ボリュームにキャッシュされ、次回以降は瞬時に起動します）。

2. **LiteLLM のヘルスチェック**:
   ブラウザや `curl` で LiteLLM Proxy のモデル一覧エンドポイントを叩き、定義したモデルが見えるか確認します。
   ```bash
   curl http://localhost:4000/v1/models
   ```

3. **RAG アプリのテスト**:
   - 源内 Web (`http://localhost:5173`) にログインします。
   - 「AIアプリ」→「ローカル RAG（ナレッジ検索）」から、ドキュメントのインジェストおよび検索を行います。
   - `rag-app` および `embedding-jp-api` のコンテナログを確認し、リクエストが適切にルーティングされていること、プレフィックスが正常に処理されているかを確認してください。
