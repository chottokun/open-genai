# 🌐 ハイブリッド RAG 構成・導入ガイド

本ガイドでは、**「チャット推論はクラウド LLM（Google Gemini 等）、埋め込みはローカル日本語特化モデル（`ruri-v3`）」** という、コスト・セキュリティ・精度をすべて両立した構成の構築・設定方法について解説します。

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
        LiteLLM -->|チャット推論 / RAG生成| Cloud[クラウドLLM / ローカルOllama]
        LiteLLM -->|埋め込み| EmbeddingAPI[embedding_jp_api :8020]
        EmbeddingAPI -->|ローカル処理| Ruri[cl-nagoya/ruri-v3-30m]
    end
```

---

## ⚠️ 重要：モデル名の命名ルール

> **`model_name` は必ず HuggingFace モデルIDと完全一致させること**

LiteLLM の `litellm_config.yaml` で設定する `model_name` と、アプリ側の `EMBED_MODEL` 環境変数は **完全に一致** させる必要があります。

```yaml
# litellm_config.yaml ✅ 正しい例
- model_name: cl-nagoya/ruri-v3-30m    # ← HuggingFace モデルIDそのまま
  litellm_params:
    model: openai/cl-nagoya/ruri-v3-30m
```

```bash
# .env ✅ 正しい例
EMBED_MODEL=cl-nagoya/ruri-v3-30m      # ← litellm_config.yaml の model_name と一致
```

```yaml
# ❌ 間違いやすい例（エイリアスを使った場合）
- model_name: ruri-base                 # ← これでは EMBED_MODEL=ruri-base と設定が必要
                                        #   モデル変更時に混乱しやすい
```

**エイリアス（`ruri-base` / `ruri-small` 等）を使うと、モデルを変えたときに `model_name` と `EMBED_MODEL` のどちらを変えるべきか混乱しやすくなります。モデルIDをそのまま使うのが最もシンプルです。**

---

## 🔄 Embeddingモデル変更時のトラブルシューティング

### 利用可能な ruri-v3 モデル一覧

| HuggingFace モデルID | パラメータ数 | 出力次元 | 最大トークン | 特徴 |
|---|---|---|---|---|
| `cl-nagoya/ruri-v3-30m` | 30M | **256** | 8192 | 軽量・高速・ModernBERT-Ja |
| `cl-nagoya/ruri-v3-70m` | 70M | **256** | 8192 | バランス型 |
| `cl-nagoya/ruri-v3-310m` | 310M | **768** | 8192 | 最高精度 |

> ⚠️ **モデルを変えると出力次元数が変わる場合があります。** 次元数が違うと Qdrant への upsert が 400 エラーになります。

---

### 📋 モデル変更の正しい手順

**必ず以下の順序で変更してください：**

#### ステップ1：設定ファイルを更新

```yaml
# litellm_config.yaml
- model_name: cl-nagoya/ruri-v3-310m    # ← 新しいモデルIDに変更
  litellm_params:
    model: openai/cl-nagoya/ruri-v3-310m
    api_base: "http://embedding-jp-api:8000/v1"
    api_key: "not-needed"
```

```bash
# .env
EMBED_MODEL=cl-nagoya/ruri-v3-310m     # ← model_name と一致させる
EMBED_DIM=768                           # ← 新モデルの次元数に変更
EMBED_MODEL_NAME=cl-nagoya/ruri-v3-310m  # ← embedding-jp-api が読み込むモデル
```

#### ステップ2：Qdrant のコレクションを削除

```bash
# 既存コレクションを削除（次元数が変わるため必須）
curl -X DELETE http://localhost:6333/collections/open_genai_rag
```

> ⚠️ **この操作でコレクション内のすべてのベクトルが削除されます。** 次のステップで再登録が必要です。

#### ステップ3：コンテナを再起動

```bash
# embedding-jp-api を新モデルで再ビルド（初回はモデルダウンロードが発生）
docker compose up -d --build embedding-jp-api

# LiteLLM を再起動して新しい設定を読み込む
docker compose restart litellm

# rag-app を再起動して新しい環境変数を反映
docker compose up -d --force-recreate rag-app
```

#### ステップ4：ドキュメントを再 ingest

コレクションが削除されたため、すべてのドキュメントを再登録します。

```bash
curl -X POST http://localhost:8001/ingest \
  -H "Content-Type: application/json" \
  -H "x-api-key: local-rag-key" \
  -d '{
    "documents": [
      {"source": "テスト", "text": "テスト文書です。"}
    ]
  }'
# → {"added_chunks":1,"total_chunks":1} が返れば成功
```

#### ステップ5：次元数を確認

```bash
curl -s http://localhost:6333/collections/open_genai_rag | \
  python3 -c "import sys,json; r=json.load(sys.stdin)['result']; \
  print('次元数:', r['config']['params']['vectors']['size'])"
# → 次元数: 768  (ruri-v3-310m の場合)
```

---

### 🐛 よくあるエラーと対処法

| エラー | 原因 | 対処 |
|---|---|---|
| `400 Bad Request` (Qdrant upsert) | コレクションの次元数とモデルの次元数が不一致 | コレクションを削除してモデルに合わせた次元数で再作成 |
| `400 Bad Request` (LiteLLM embeddings) | `EMBED_MODEL` が `model_name` と一致していない | `.env` の `EMBED_MODEL` を `litellm_config.yaml` の `model_name` と一致させる |
| `404 Not Found` (Qdrant) | コレクションが存在しない | `/ingest` を実行すると `ensure_collection()` が自動作成する |
| `500 Internal Server Error` | embedding-jp-api のモデルダウンロード中 | `docker compose logs embedding-jp-api` でダウンロード完了を待つ |
| 環境変数が古い値のまま | `.env` ではなく `docker-compose.yml` のデフォルト値が使われている | `.env` に明示的に値を設定し `--force-recreate` で再起動 |

---

## 🌐 OpenAI 互換サーバーの接続設定

`OPENAI_BASE_URL` を変えるだけで、さまざまな LLM プロバイダーに接続できます。

### ローカル

| サービス | `OPENAI_BASE_URL` | `OPENAI_API_KEY` |
|---|---|---|
| Ollama | `http://host.docker.internal:11434/v1` | `ollama` |
| LM Studio | `http://host.docker.internal:1234/v1` | `lm-studio` |
| vLLM | `http://<host>:8000/v1` | 任意トークン |

### クラウド

| サービス | `OPENAI_BASE_URL` | 備考 |
|---|---|---|
| **さくらインターネット AI クラウド** | `https://api.sakura.ai/v1` | 国産・低コスト・高速 |
| Groq | `https://api.groq.com/openai/v1` | 超高速推論 |
| OpenAI | `https://api.openai.com/v1` | GPT-4o 等 |
| Azure OpenAI | `https://<resource>.openai.azure.com/` | 行政・エンタープライズ向け |

> 💡 **LiteLLM 経由の場合** は `OPENAI_BASE_URL=http://litellm:4000/v1` に固定し、`litellm_config.yaml` に各プロバイダーを定義します。`.env` を変更せずにモデルを切り替えられます。

---

## 🛠️ 設定手順（全体）

### 1. `litellm_config.yaml` の定義

```yaml
model_list:
  # チャット推論：Google Gemini（クラウド）
  - model_name: gemini-1.5-pro
    litellm_params:
      model: gemini/gemini-1.5-pro
      api_key: "os.environ/GEMINI_API_KEY"

  # チャット推論：さくらインターネット AI クラウド
  - model_name: sakura-ai-chat
    litellm_params:
      model: openai/Llama-3.3-70B-Instruct
      api_base: "https://api.sakura.ai/v1"
      api_key: "os.environ/SAKURA_AI_API_KEY"

  # チャット推論：ローカルOllama（フォールバック）
  - model_name: local-ollama-chat
    litellm_params:
      model: ollama/qwen2.5:7b
      api_base: "http://host.docker.internal:11434"

  # 日本語Embedding：model_name は HuggingFace ID と完全一致させること
  - model_name: cl-nagoya/ruri-v3-30m
    litellm_params:
      model: openai/cl-nagoya/ruri-v3-30m
      api_base: "http://embedding-jp-api:8000/v1"
      api_key: "not-needed"
```

### 2. `.env` の設定

```bash
GEMINI_API_KEY=AIzaSy...
EMBED_MODEL_NAME=cl-nagoya/ruri-v3-30m   # embedding-jp-api が読み込むモデル
EMBED_MODEL=cl-nagoya/ruri-v3-30m        # litellm_config.yaml の model_name と一致
EMBED_DIM=256                             # モデルの出力次元数（30m/70m→256, 310m→768）
RAG_MODEL=gemini-1.5-pro                 # 回答生成モデル
EMBED_QUERY_PREFIX=検索クエリ: 
EMBED_DOC_PREFIX=検索文書: 
```

### 3. 起動

```bash
docker compose up -d --build
```

初回起動時、`embedding-jp-api` が HuggingFace からモデルをダウンロードします（ダウンロード済みは `huggingface_cache` ボリュームにキャッシュ）。

### 4. 動作確認

```bash
# LiteLLM モデル一覧
curl http://localhost:4000/v1/models | python3 -m json.tool

# Embedding テスト
curl -X POST http://localhost:4000/v1/embeddings \
  -H "Content-Type: application/json" \
  -d '{"model": "cl-nagoya/ruri-v3-30m", "input": "テスト文章"}'

# RAG ingest テスト
curl -X POST http://localhost:8001/ingest \
  -H "Content-Type: application/json" \
  -H "x-api-key: local-rag-key" \
  -d '{"documents": [{"source": "テスト", "text": "テスト文書です。"}]}'
```
