# 新規モデルの追加・設定ガイド

本プロジェクトにおいて、新しく LLM モデルを追加・設定する際の手順、および環境変数（`.env`）と LiteLLM 設定ファイル（`litellm_config.yaml`）の役割分担について解説します。

---

## 1. 設定の全体構造と役割分担

LLM のモデル追加と接続設定は、役割に応じて **`.env`** と **`litellm_config.yaml`** に分かれています。

| 設定ファイル | 主な役割 | 設定する主な項目 |
| :--- | :--- | :--- |
| **`.env`**<br>(環境変数) | 認証情報やシステム全体の動作制御 | <ul><li>各種外部APIのアクセスキー（例: `SAKURA_AI_API_KEY`）</li><li>システムの動作設定（例: `ALLOW_CLOUD_API=false`）</li><li>デフォルトモデル指定（例: `DEFAULT_MODEL=gemma4`）</li></ul> |
| **`litellm_config.yaml`**<br>(LiteLLMモデル定義) | 利用可能なモデル一覧と各接続先定義 | <ul><li>画面に表示するモデル名（`model_name`）</li><li>実際のプロバイダー名やモデルID（`model`）</li><li>エンドポイントURL（`api_base`）</li></ul> |

---

## 2. 新規モデルの追加手順

モデルを追加する際は、以下のステップに沿って設定を行います。

### ステップ①: `litellm_config.yaml` への記述
ルートディレクトリにある [litellm_config.yaml](file:///home/nobuhiko/Project/open-genai/litellm_config.yaml) に追加したいモデルの定義を追加します。

```yaml
- model_name: sakura-gpt-oss-120b # UI画面などで表示・選択されるモデルID
  litellm_params:
    model: gpt-oss-120b           # 接続先プロバイダーでの実際のモデル名
    custom_llm_provider: openai    # プロバイダーの種別
    api_base: "os.environ/SAKURA_AI_API_BASE" # 環境変数からエンドポイントを読み込む
    api_key: "os.environ/SAKURA_AI_API_KEY"   # 環境変数からAPIキーを読み込む
```
> **補足**: `api_base` や `api_key` に `"os.environ/環境変数名"` の形式で記述することで、セキュリティ情報のハードコーディングを防ぎ、`.env` で設定した環境変数を安全に LiteLLM に引き渡すことができます。

### ステップ②: `.env` での認証情報（環境変数）の設定
上記ステップ①で指定した環境変数を、ルートディレクトリの `.env` ファイルに記述します。
```env
SAKURA_AI_API_BASE=https://api.ai.sakura.ad.jp/v1/
SAKURA_AI_API_KEY=your-api-key-here
```

### ステップ③: 外部クラウドAPI制限ポリシー（`ALLOW_CLOUD_API`）の確認
閉域・ローカル運用を想定し、初期状態で外部のパブリッククラウドAPI（Google GeminiやOpenAI等）の利用をブロックする制限（`ALLOW_CLOUD_API=false`）が有効になっています。

新しく追加したモデルをこのブロック制限から除外させたい場合、以下の**LiteLLM自動連動判定**によって自動的に利用が許可されます。

#### 💡 LiteLLM 自動連動判定の仕様
バックエンドは、モデルの要求を受けると LiteLLM 側の設定（`/model/info`）を動的に確認し、以下の条件のいずれかに合致するモデルを**安全なモデル**と判定し、制限から自動的に除外します。

1. `api_base`（APIのベースURL）に以下のいずれかの安全なドメインが含まれている場合:
   - `localhost` / `127.0.0.1` / `host.docker.internal`
   - `embedding-jp-api` / `local-sd-api` (ローカル連携用コンテナ)
   - `sakura.ad.jp` (さくら AI Engine 等の国内完結クラウド)
2. 接続先モデル名（`litellm_params.model`）が `ollama/` で始まっている場合。

> **※例外対応**: もし上記ドメインに当てはまらないが明示的に許可したいローカル/国内モデルがある場合は、[backend/app/main.py](file:///home/nobuhiko/Project/open-genai/backend/app/main.py#L1158) 内の `local_keywords` リストにキーワード（例: `"my-safe-model"`）を追記することで明示的に回避できます。

---

## 3. 設定変更の反映手順

設定を変更した後は、コンテナを再起動（または再ビルド）して反映させます。

### `litellm_config.yaml` や `.env` のみを変更した場合
LiteLLMコンテナおよび関連コンテナを再起動すれば変更が反映されます。
```bash
docker compose restart litellm backend
```

### バックエンドのコード（`main.py` など）を変更した場合
バックエンド（`backend`）コンテナは、ソースコードがマウントされておらずイメージに内包されているため、変更を反映させるには**イメージの再ビルド**が必要です。
```bash
# 変更を取り込んでイメージを再ビルド
docker compose build backend

# コンテナを再生成して起動
docker compose up -d backend
```
