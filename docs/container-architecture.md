# OpenGENAI コンテナ・アーキテクチャ構成ガイド

本ドキュメントでは、OpenGENAI を構成する全コンテナの役割、配置系統、およびコンテナ間の相互通信フローを整理し、今後の更なるマイクロサービス化・外出し化に向けたシステム全体の現状（As-Is）を明記します。

---

## 1. 全体アーキテクチャ概要

OpenGENAI は、クラウドのマネージドサービス（Amazon Transcribe、S3、Bedrockなど）への依存を排除し、完全閉域網（LGWAN等）での運用や独自ガバナンスの適用を可能にするため、すべての機能を独立した **Docker コンテナ（マイクロサービス）** に分割して構築しています。

Nginx（`proxy`）を単一の入口とし、フロントエンド（`web`）、認証（`keycloak`）、APIゲートウェイおよび調整役としての `backend`、そして個別のビジネスロジックを持つ複数の **AIアプリ（exApps）** がメッシュ状に連携する構成を採っています。

---

## 2. コンテナ役割一覧（全31コンテナの系統別分類）

システムを構成するコンテナ群は、その役割に応じて以下の4つの系統に分類されます。

### ① エントリ・ルーティング系統 (ゲートウェイ層)
ユーザーからのアクセスを受け付け、適切なサービスにルーティングします。

| コンテナ名 | サービス名 | ポート (内部/外部) | 主な役割 |
| :--- | :--- | :--- | :--- |
| `open-genai-proxy` | `proxy` | `80:80` | Nginxによる単一アクセス入口。SSL/TLS終端やリバースプロキシを担当。 |
| `open-genai-litellm` | `litellm` | `4000:4000` | 外部クラウドAPI（Gemini/OpenAI等）およびローカルモデルのマルチプロバイダ・プロキシ。 |

### ② アプリケーション・共通基盤系統
システムのコアロジック、データ永続化、認証認可を担当します。

| コンテナ名 | サービス名 | ポート (内部/外部) | 主な役割 |
| :--- | :--- | :--- | :--- |
| `open-genai-backend` | `backend` | `8000:8000` | FastAPIによるバックエンドAPI。チャット管理、AIアプリ連携、監査等のコア制御。 |
| `open-genai-web` | `web` | `5173:-` | ViteによるNext.js/ReactフロントエンドUI（SPA）。 |
| `open-genai-keycloak` | `keycloak` | `8080:-` | SAML 2.0 認証プロバイダ（IdP）。組織内認証連携を担当。 |
| `open-genai-qdrant` | `qdrant` | `6333:6333` | ベクトルデータベース。RAGドキュメントのベクトル検索。 |
| `open-genai-seaweedfs` | `seaweedfs` | `8333:8333` | S3互換オブジェクトストレージ。成果物ファイルの再ホストと署名付きURL配信。 |

### ③ AIアプリ系統 (exApps)
バックエンドからHMAC認証を経て呼び出される、機能ごとの独立したサービス群です。

| コンテナ名 | サービス名 | ポート (内部/外部) | 主な役割 |
| :--- | :--- | :--- | :--- |
| `open-genai-whisper-app` | `whisper-app` | `8002:8002` | 音声認識のプロキシ・ルーティング層。認証検証と推論中継。 |
| `open-genai-sd-app` | `sd-app` | `8003:-` | 画像生成AIアプリ。ローカルSD(A1111)またはLiteLLMへのプロキシ。 |
| `open-genai-rag-app` | `rag-app` | `8001:8001` | RAG（ドキュメント検索・埋め込み）AIアプリ。非同期バッチ処理を内包。 |
| `open-genai-prompt-app` | `prompt-app` | `8009:-` | プロンプトエンジニアリング・テンプレート管理用AIアプリ。 |
| `open-genai-usermgmt-app` | `usermgmt-app` | `8006:-` | Keycloakと連携した組織・ユーザー管理AIアプリ。 |
| `open-genai-modelpolicy-app`| `modelpolicy-app`| `8007:-` | チーム/グループごとの利用可能モデル制御ポリシーAIアプリ。 |
| `open-genai-ngword-app` | `ngword-app` | `8008:-` | 機微情報・不適切ワードの入力フィルタリングAIアプリ。 |
| `open-genai-audit-app` | `audit-app` | `8005:-` | 監査ログ管理およびガバナンスレポートAIアプリ。 |
| `open-genai-dify-app` | `dify-app` | `8004:-` | Difyなどの外部ローコードツール等と連携するためのアダプタアプリ。 |

### ④ 推論・ベクトル化エンジン系統 (推論層)
実際のディープラーニングモデル（LLM/Embedding/Speech-to-Text/Stable Diffusion）を動作させる心臓部です。

| コンテナ名 | サービス名 | ポート (内部/外部) | 主な役割 |
| :--- | :--- | :--- | :--- |
| `local-whisper-api` | `local-whisper-api`| `8003:8000` | **[新規]** 音声認識推論層。Kotoba-Whisper やオリジナル Whisper の実行環境（GPU/CPU対応）。 |
| `local-sd-api` | `local-sd-api` | `8004:8000` | **[新規]** 画像生成推論層。Stable Diffusionの実行環境。 |
| `open-genai-embedding-jp-api`| `embedding-jp-api`| `8020:8000` | 日本語特化 Embedding (`ruri-v3-30m`) のベクトル化エンジン。 |

---

## 3. コンテナ間通信フロー図

ユーザーからリクエストが送信されてから、各コンテナがどのように連鎖的に呼び出されるかの全体マップです。

```mermaid
flowchart TD
    subgraph user ["外部 / ユーザー環境"]
        Browser["ブラウザ : SPA画面"]
    end

    subgraph gateway ["ゲートウェイ・ルーティング層"]
        Proxy["Proxy : Nginx ポート80"]
        LiteLLM["LiteLLM Proxy ポート4000"]
    end

    subgraph platform ["共通基盤層"]
        Web["Web UI : Next.js"]
        Keycloak["Keycloak : SAML IdP"]
        Backend["Backend API : FastAPI"]
        Qdrant[("Qdrant : ベクトルDB")]
        SeaweedFS[("SeaweedFS : S3互換ストレージ")]
    end

    subgraph apps ["AIアプリ層 (exApps)"]
        WhisperApp["whisper-app : 音声プロキシ"]
        RagApp["rag-app : RAGロジック"]
        SdApp["sd-app : 画像プロキシ"]
        OtherApps["その他アプリ : 監査/ポリシー等"]
    end

    subgraph inference ["ローカル推論層"]
        WhisperAPI["local-whisper-api : 音声推論"]
        SdAPI["local-sd-api : 画像推論"]
        EmbedAPI["embedding-jp-api : ベクトル化"]
    end

    %% ユーザーからのアクセス
    Browser -->|HTTPS/HTTP| Proxy
    Proxy -->|静的ファイル| Web
    Proxy -->|SAML 認証リクエスト| Keycloak
    Proxy -->|API リクエスト| Backend

    %% Backendからのルーティング
    Backend -->|JWT 署名検証| Keycloak
    Backend -->|LLMチャット推論中継| LiteLLM
    Backend -->|HMAC署名付き呼び出し| WhisperApp
    Backend -->|HMAC署名付き呼び出し| RagApp
    Backend -->|HMAC署名付き呼び出し| SdApp
    Backend -->|HMAC署名付き呼び出し| OtherApps

    %% AIアプリからの下流呼び出し
    WhisperApp -->|ローカル中継 /v1/audio/transcriptions| WhisperAPI
    RagApp -->|ローカル中継 /v1/embeddings| EmbedAPI
    RagApp -->|ベクトル検索 / 格納| Qdrant
    RagApp -->|ファイル保管| SeaweedFS
    SdApp -->|ローカル中継 /v1/images/generations| SdAPI
    SdApp -.->|A1111 互換API (ホスト)| HostSD["ホスト上のStable Diffusion"]

    %% 外部クラウドAPI
    LiteLLM -->|API キー認証| CloudAPI["外部クラウドAPI / OpenAI等"]
```

---

## 4. マイクロサービス化ロードマップと設計指針

今回、音声認識（Whisper）を **「ルーティング・認証層（`whisper-app`）」** と **「推論層（`local-whisper-api`）」** に分割したアプローチは、今後のマイクロサービス設計の標準モデルとなります。

### 分割（外出し）のメリット
1. **リソース配置の最適化**:
   * 推論コンテナ（`local-whisper-api`）にのみ GPU やメモリを集中させることができ、Webアプリケーション側（`backend`）のリソースを圧迫しません。
2. **モデル切り替えの容易性**:
   * 環境変数の設定変更（`.env`）だけで、Kotoba-Whisper やオリジナル Whisper など様々なオープンモデルを瞬時に切り替えられます。
3. **セキュリティ境界の明確化**:
   * `ALLOW_CLOUD_API=false` の安全ガードレールをプロキシ層（`whisper-app`）で一括管理し、ローカル閉域通信と外部クラウド通信を論理的に分離します。

### 今後の分割候補と拡張ロードマップ

* **画像生成（Stable Diffusion）の完全コンテナ化と段階的アップグレード (As-Is / To-Be)**:
  * **[対応完了]** ホストの AUTOMATIC1111 サーバへの依存を解消し、コンテナ内推論エンジン `local-sd-api` の切り出しを完了しました。
  * **[多様な画像モデルへの動的対応とハイブリッド・プロキシ構成 (Toxicity & OOM Guard)]**:
    * `local-sd-api` は、コンテナの役割を「ローカルでの重いモデル推論（CPU/GPU）」と「LiteLLM Proxy 経由の上流モデル（Imagen 4 等）への透過中継プロキシ」の間で動的に切り替えられる**ハイブリッド構成**を採用しています。
    * 環境変数 **`SD_USE_PROXY=true`** の場合、コンテナ内での Stable Diffusion のメモリ展開を完全にバイパスします。これにより、起動時間は1秒未満に短縮され、CPU開発環境におけるメモリ不足（OOM）やタイムアウト死を 100% 回避した「最も堅実な配管疎通（配管テスト）」が可能になります。
  * **[設計指針: スモールスタートと段階的スケール]**:
    * **第1段階 (検証・プロキシフェーズ / 推奨)**: `SD_USE_PROXY=true` にて、 `open-genai-litellm` 経由で上流の安定したクラウド画像モデル（`imagen-4` 等）に中継。リソース消費を極小化した状態でシステム全体の疎通テストを完了させます。
    * **第2段階 (ローカルGPU推論フェーズ)**: GPU インフラが整った段階で `SD_USE_PROXY=false` に切り替え、軽量高速な蒸留モデル **`SimianLuo/LCM_Dreamshaper_v7`** (約2GB, 4ステップ推論) をローカルロードして稼働させます。
    * **第3段階 (高品質ローカル推論フェーズ)**: `IMAGE_MODEL_NAME` を **`SDXL-Lightning`** (4-Step/8-Step, 約5GB) に切り替えることで、実用的な高品質ローカル画像生成を実現します。
    * **第4段階 (プロダクションフェーズ)**: 最先端の画像生成モデル **`FLUX.1 [schnell]`** などをロードし、文字の描画や手の形状破綻がない商用クオリティの生成へと、バックエンドや中継層のソース修正不要（環境変数の変更のみ）で安全にスケールアップします。
  * **[LiteLLM Proxy のハブ（軸）化による抽象化]**:
    * すべての AI リクエスト（LLM、音声、画像）を `open-genai-litellm` に集約・ルーティングしておくことで、裏側のモデルや中継構成を切り替える際も、フロントエンドやバックエンドの再ビルドを伴わずに安全にモデルリプレイスが完了します。

* **RAG 埋め込みエンジンの拡張**:
  * `embedding-jp-api` をさらに拡張し、複数のローカル埋め込みモデル（Rerankerなど）を柔軟に差し替え可能にする。
