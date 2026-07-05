# 新規モデルの追加・設定ガイド

本プロジェクトにおいて、新しく LLM モデルを追加・設定する際の手順および制限ポリシーとの連動仕様について解説します。

---

## 1. 全体手順

モデルを追加する際は、以下の 2 つの手順を行います。

### 手順①: `litellm_config.yaml` へのモデル登録
ルートディレクトリにある [litellm_config.yaml](file:///home/nobuhiko/Project/open-genai/litellm_config.yaml) に追加したいモデルを記述します。

```yaml
- model_name: <モデル名（画面に表示させたいID）>
  litellm_params:
    model: <実際のプロバイダー名/モデル名（例: ollama/gemma4）>
    api_base: <APIの接続先ベースURL（例: http://host.docker.internal:11434）>
    api_key: <必要に応じてAPIキー>
```

設定後、以下のコマンドで LiteLLM コンテナを再起動して設定を反映します。
```bash
docker compose restart litellm
```

### 手順②: 外部クラウドAPI制限ポリシー（`ALLOW_CLOUD_API`）の考慮
本システムは、セキュアな閉域運用を想定して、初期状態で外部のクラウドAPI（Google GeminiやOpenAIなどのグローバルクラウド）の利用をブロックする制限（`ALLOW_CLOUD_API=false`）が有効になっています。

新しく追加するモデルがブロック対象外（ローカル運用・国内完結など）の場合、以下の**LiteLLM自動連動判定**の仕組みによって自動的に利用が許可されます。

---

## 2. LiteLLM 自動連動判定（ローカル/国内完結モデルの自動識別）

バックエンド（FastAPI）は、チャットや画像生成の要求を受け取ると、LiteLLM が保持しているモデル設定（`/model/info` エンドポイント）を動的にチェックします。

以下の条件に当てはまるモデルは、**「安全なローカル/国内完結モデル」**と自動判定され、外部クラウドAPIのブロック対象から自動的に除外されます。

### 自動許可の判定基準
1. `litellm_config.yaml` で設定された `api_base`（APIのベースURL）に、以下の安全なドメイン/キーワードが含まれている場合:
   - `localhost`
   - `127.0.0.1`
   - `host.docker.internal`
   - `embedding-jp-api`
   - `local-sd-api`
   - `sakura.ad.jp`（さくら AI Engine 等の国内完結クラウド）
2. 接続先モデル名（`litellm_params.model`）が `ollama/` で始まっている場合。

これにより、上記に合致するローカル環境や国内クラウド의モデルを追加する際は、**バックエンドのソースコードを変更することなく、`litellm_config.yaml` の編集のみで自動的に連動して利用可能**になります。

### 例外: ハードコードによる明示的許可
LiteLLMコンテナが一時的に停止している等の理由で自動判定が行えない場合のフォールバックとして、[backend/app/main.py](file:///home/nobuhiko/Project/open-genai/backend/app/main.py) の `local_keywords` リストにモデル名の一部をハードコーディングすることでも、明示的にブロックを回避できます。
```python
local_keywords = ["gemma4", "local-ollama", "ruri-v3", "localhost", "qwen2.5", "sakura"]
```

---

## 3. コンテナへの変更反映について

`backend` コンテナは、ソースコードがボリュームマウントされておらず、コンテナ作成時のビルドイメージに埋め込まれたプログラムが稼働する構成になっています。

そのため、万が一 [backend/app/main.py](file:///home/nobuhiko/Project/open-genai/backend/app/main.py) などのバックエンドのソースコードに直接変更を加えた場合は、単なる `docker compose restart backend` では変更が反映されません。
コード変更を反映させるには、以下のコマンドを実行してイメージを再ビルドした上でコンテナを再起動してください。

```bash
# 変更を取り込んでイメージを再ビルド
docker compose build backend

# コンテナを再生成して起動
docker compose up -d backend
```
