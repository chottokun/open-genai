# open-genaiにおけるLiteLLM統合型画像生成アーキテクチャおよび推論基盤分離に関する調査報告書

---

## 1. 概要と背景

デジタル庁がMITライセンスで公開したガバメントAI基盤「源内（GENAI）」を起点とし、完全ローカル運用やマルチクラウド展開に対応したオープンソースソフトウェアとして進化を続ける「open-genai」プロジェクトは、行政実務やエンタープライズ領域におけるデータ主権の確保、ベンダーロックインの完全排除、ならびに高いシステム拡張性を実現する先進的な基盤として確固たる位置を築いている。

本調査報告書では、open-genaiのさらなる保守性向上と拡張性の獲得に向け、画像生成機能をLiteLLMプロキシ層経由に集約してOpenAI API規格（`/v1/images/generations`）への高い互換性を確保する設計、ならびにローカルLLMやローカル画像生成エンジンをコアアプリケーションスタックから物理的・論理的に分離（デカップリング）させるマイクロサービス・API Gateway構成について、技術的実行可能性、アーキテクチャ上の優位性、設計パラメータ、および運用上のガバナンス構造を包括的に分析・提言する。

---

## 2. open-genaiの現行構造と技術的課題の分析

open-genaiは、元のクラウド依存型アーキテクチャ（AWS Cognito、AWS Lambda、Amazon Bedrock等）を、オンプレミスやLGWANなどの閉域網環境下でも動作可能なローカルマイクロサービス群へと再構築した構造を有している。

システムの全体像は、以下のコンポーネントによって構成されている：
- **Web UI層 (`genai-web`)**: ReactおよびViteで構築されたフロントエンド。
- **FastAPIバックエンド層 (`backend/`)**: SAML Service Provider機能やチーム管理APIを兼ね備えたコアロジック。
- **SAML Identity Provider認証層 (`keycloak/`)**: Keycloakを用いた組織内認証連携。
- **S3互換ローカルオブジェクトストレージ層 (`seaweedfs/`)**: 生成アセットの一元管理および署名付きURL配信を担うストレージ。
- **周辺サービス群**: 監査ログ参照（`audit-app/`）、利用制御ポリシー管理（`modelpolicy-app/`）、禁止語・個人情報フィルタリング（`ngword-app/`）、RAG検索（`rag-app/`, `knowledge-mcp/`）等。

しかしながら、システムの進化に伴い、従来型の密結合な構成に起因する二つの主要な技術的ボトルネックが顕在化している。

### 課題1：画像生成インターフェースの非標準化に伴うアプリケーションコードの複雑化
テキスト生成領域においてはOpenAI Chat Completions APIが事実上の世界標準規格として機能しているのに対し、画像生成領域ではオープンソースのStable Diffusion (SD) WebUI、ComfyUI、Xinference、ならびに商用サービスのOpenAI (DALL-E 3 / GPT-Image-1)、Google (Imagen 4 / Gemini)、Recraftなどの間でAPIエンドポイント、リクエスト構造、アスペクト比指定法、レスポンス形式が大きく異なっている。これにより、アプリケーションバックエンド内に個別の変換アダプタを保持せざるを得ず、新たな画像モデルの追加や仕様変更のたびにコアコードの改修が発生する構造となっている。

### 課題2：ローカル推論エンジンとアプリケーションサーバーの強固な結合によるスケール阻害
画像生成や大規模言語モデルの推論は、極めて高いVRAMおよびGPU計算リソースを消費する。推論エンジンがバックエンドのコンテナスタックと同一ノードまたは直接的な依存関係で配置されている場合、重い画像生成処理によってWeb APIの応答性が阻害されたり、特定のGPU障害がシステム全体の停止に直結したりするリスクが生じる。また、開発・検証環境と本番環境、あるいはLGWAN環境とクラウド環境の間で推論エンジンの接続先を動的に切り替えることが困難である点も運用上の制約となっている。

---

## 3. LiteLLMを中核とする画像生成エンドポイントの標準化

### 3.1 LiteLLM Image Generationの機能仕様とパラメータ統合
LiteLLMは、多種多様なLLMプロバイダをOpenAI互換インターフェースへ統合するオープンソースのAPI GatewayおよびPython SDKであり、テキスト生成にとどまらず画像生成エンドポイント（`/v1/images/generations`）に対しても高度な集約・透過機能を提供している。

open-genaiの画像生成機能をLiteLLM経由に一元化することで、アプリケーション（`backend/`）側は宛先がローカルGPUサーバー（Xinference等）であるか外部の商用クラウドAPI（OpenAI、Azure、Vertex AI、Bedrock等）であるかを意識することなく、統一されたOpenAI標準フォーマットでリクエストを送信可能となる。

LiteLLM Proxyおよび `image_generation()` 関数は、以下の標準パラメータを認識し、各バックエンドプロバイダの固有フォーマットへ自動変換して仲介する：
- **`prompt`** (文字列, 必須): 生成対象のテキスト記述。
- **`model`** (文字列, オプション): 呼び出し対象のモデル識別子（例: `openai/gpt-image-1`, `xinference/sd3.5`, `vertex_ai/imagen-4.0` 等）。
- **`n`** (整数, オプション): 生成する画像枚数。
- **`quality`** (文字列, オプション): 生成品質の指定 (`auto`, `standard`, `hd`, `high`, `medium`, `low`)。
- **`response_format`** (文字列, オプション): 返却データ構造の指定 (`url` または `b64_json`)。
- **`size`** (文字列, オプション): 画像解像度の指定 (`1024x1024`, `1536x1024`, `1024x1536`, `1792x1024` 等)。
- **`style`** (文字列, オプション): 画像スタイルの指定 (`vivid`, `natural` 等)。

さらに、標準規格に含まれないプロバイダ固有の拡張機能についても、LiteLLMは透過的なペイロード伝播機構をサポートしている。例えば、Google GeminiやVertex AIモデルにおける詳細な画像構成オブジェクト（`imageConfig` 内の `aspectRatio`, `imageSize`, `personGeneration`, `imageOutputOptions`）やWeb検索グラウンディング設定（`web_search_options`）、あるいはRecraftにおける独自スタイルID（`style_id`）などは、リクエストボディ内の拡張パラメータとしてそのまま目的のプロバイダへ伝送される。

### 3.2 主要画像生成プロバイダの仕様比較
LiteLLMをゲートウェイとして導入することで、open-genaiから透過的に切り替え利用が可能となる主要プロバイダの技術特性および適合ユースケースを以下に示す。

| プロバイダ名称 | LiteLLMモデルプレフィックス | 代表的対応モデル | アーキテクチャ上の主要特性 | 適合する運用ユースケース |
| :--- | :--- | :--- | :--- | :--- |
| **OpenAI / Azure OpenAI** | `openai/`, `azure/` | `gpt-image-1`, `dall-e-3` | 卓越した指示追従性、正確な文字描画能力、マルチモーダル編集機能 | 高品質な広報資料作成、複雑な構図指示を要する図解生成 |
| **Google AI Studio / Vertex AI** | `gemini/`, `vertex_ai/` | `imagen-4.0-generate-001`, `gemini-3.1-flash-image` | 最高4Kの高解像度出力、リアルタイムWeb検索連携 (Grounding)、多様な比率設定 | 最新情報に基づくリアルタイム画像生成、高精細デザイン制作 |
| **AWS Bedrock** | `bedrock/` | `stability.stable-diffusion-xl-v0`, `amazon.nova-canvas` | AWSインフラ統合、KMSによる暗号化、IAM権限管理との完全親和性 | ガバナンスおよびクラウドアカウント統合を重視する企業環境 |
| **Xinference (ローカル推論)** | `xinference/` | `stabilityai/stable-diffusion-3.5-large`, `sdxl-base-1.0` | 完全オンプレミス・閉域網動作、オープン重みモデルの自由な差し替え | 外部通信が厳しく制限されたLGWAN・機密情報取扱環境 |
| **Black Forest Labs / Recraft** | `bfl/`, `recraft/` | `flux-pro`, `recraftv3` | 高度なベクターグラフィック生成、スタイルID指定による一貫性維持 | デザイン業務、特定のブランディングに沿った連続素材作成 |
| **Nscale (EU Sovereign)** | `nscale/` | `stabilityai/stable-diffusion-xl-base-1.0` | 欧州データ主権完全準拠、低コスト・サーバーレス実行 | 海外拠点対応、厳格なデータ主権遵守が求められる環境 |

---

## 4. ローカルLLMおよびローカル画像生成基盤の完全分離設計

### 4.1 マイクロサービス化とデカップリングの設計思想
open-genaiの拡張性と耐障害性を極大化するための鍵は、アプリケーションのコアロジック（`backend/` および `genai-web`）から、計算負荷の高い「LLM推論基盤」および「画像生成エンジン」を完全に隔離し、ステートレスな独立APIサービスとして再定義することにある。

このデカップリング手法では、すべての推論・生成リクエストを単一のLiteLLM Proxy層に集約する。アプリケーション側はプロキシの統一APIエンドポイント（`http://your-domain.local:4000/v1` または `http://litellm-proxy:4000/v1`）のみを参照するため、バックエンド側の推論インフラをOllamaからvLLMへ変更したり、ローカルのStable DiffusionからクラウドのGPT-Image-1へ切り替えたりした場合でも、open-genai側のアプリケーションコード変更や再デプロイは一切不要となる。

### 4.2 推論基盤結合方式の比較評価
推論基盤の分離構造について、従来型構成と提言モデルの比較を以下に整理する。

| 評価軸 | 1. モノリシック密結合型（従来構成） | 2. マイクロサービス直接呼出型 | 3. LiteLLM Proxy集約分離型（推奨提言） |
| :--- | :--- | :--- | :--- |
| **構造の概要** | アプリコンテナ内で推論ライブラリやローカルプロセスを直接起動・保持 | アプリからローカルOllamaやSD WebUIの独自APIを個別エンドポイント指定で直接呼び出し | アプリと推論基盤間にLiteLLM Proxyを介在させ、全生成リクエストを一元仲介 |
| **保守性・コード複雑性** | 低（推論エンジン依存のコードがアプリ内に散在し改修影響が大きい） | 中（プロバイダごとのパラメータ変換ロジックがバックエンドに残存） | 極めて高（アプリ側はOpenAI標準規格のみを扱い、コードがシンプル化） |
| **インフラ拡張性・柔軟性** | 低（GPUノードとWebサーバーの個別スケールが不可能） | 中（コンテナは分離されるがエンドポイント変更時に再設定が必要） | 極めて高（設定ファイルの変更のみで、ローカル/クラウドを動的に切替・併用可能） |
| **耐障害性・可用性** | 低（推論のVRAM枯渇やクラッシュがWeb機能全体に波及） | 中（推論エラーは孤立するが、手動のフォールバック制御が必要） | 極めて高（プロキシ側で自動リトライおよび異種プロバイダへの動的フォールバックを実行） |
| **適用推奨環境** | 初期開発段階、単一ローカルPCでのスタンドアロン検証 | 中小規模の固定的なローカル運用 | 本番運用、LGWAN/クラウドハイブリッド型行政基盤 |

### 4.3 データライフサイクルと生成アセットの管理機構
推論基盤を完全分離した場合でも、open-genaiの「生成成果物はすべてローカルオブジェクトストレージ（SeaweedFS）に永続化し、署名付きURLで安全に配信する」という既存のセキュリティ設計は完全に維持される。

このデータライフサイクルは以下の明確な順序に従って処理される：
1. **リクエスト発行**: 利用者が `genai-web` 上で画像生成を要求すると、フロントエンドは `backend/` に対し、標準化されたプロンプトおよびパラメータ（サイズ、スタイル等）を送信する。
2. **Gateway中継**: `backend/` は受信したリクエストをそのままLiteLLM Proxyのエンドポイント（`http://litellm-proxy:4000/v1/images/generations`）へ転送する。
3. **推論実行および分離処理**: LiteLLM Proxyは定義されたルーティング規則に基づき、独立したローカル推論ノード（Xinference等）または外部クラウドAPIへ処理を移送する。推論エンジン側は画像を生成し、Base64文字列（`b64_json`）または一時URLとしてレスポンスをプロキシ経由で `backend/` へ返却する。
4. **SeaweedFS格納と永続化**: `backend/` は返却された画像バイナリを即座にローカルのSeaweedFSストレージコンテナへ書き込み、一意なアセットIDを付与して永続化する。
5. **署名付きURL配信**: `backend/` はSeaweedFS上のファイルパスから有効期限付きの署名付きURLを生成し、`genai-web` へ返却して画面描画を行う。

この構造により、外部の画像生成エンジンや別ノードのGPUワーカー自体は一切のセッション状態を持たない「ステートレス」な存在となり、ノードの自由な追加・削除や障害時の切り離しが極めて容易となる。

---

## 5. ガバナンス・障害耐性・閉域網適応の高度化

### 5.1 動的フォールバックと高可用性の確保
ローカルGPUリソースを用いて画像生成を行う場合、VRAM枯渇によるOutOfMemory（OOM）エラーや、混雑時のロングキューイングによるタイムアウトが頻発しやすい。LiteLLM Proxyのフォールバック機能を設定することで、システム全体の可用性が劇的に向上する。

具体的には、平時はコストがかからないローカルのXinference（Stable Diffusion 3.5）へ第一優先でリクエストをルーティングし、ローカルノードが応答停止状態に陥るかタイムアウト（例: 60秒以上）を検知した場合に、自動的に第二優先のAzure OpenAI（GPT-Image-1）やAWS Bedrockへ処理を迂回させる「ローカル優先・クラウド可溶化型」の冗長化構成が実現される。

### 5.2 利用量トラッキングとアクセス制御の一元化
LiteLLM Proxyは、通過するすべてのリクエストに対して、モデルごとの実行コスト、生成枚数、およびレスポンス時間をリアルタイムでトラッキングし、詳細なログを出力する。

open-genaiに備わっている既存の管理モジュール（監査ログ参照 `audit-app/`、モデル利用ポリシー管理 `modelpolicy-app/`、ユーザー管理 `usermgmt-app/`）とLiteLLMの認証ヘッダー（`user`, `team`）を統合することで、組織やチームごとの画像生成回数上限の設定や、不正利用の検知、部門別コストの正確な把握が可能となる。

### 5.3 セキュリティ境界とマルチ環境対応
open-genaiの導入先に応じて、`litellm_config.yaml` の設定を切り替えるだけで、システムのセキュリティ境界を厳格に制御することができる。

- **完全閉域網（LGWANや防衛・行政機密環境）**: LiteLLMのルーティング先をネットワーク内部のローカル推論ノード（`xinference/` や `ollama/`）のみに制限し、外部インターネットへのアウトバウンド通信を完全に遮断する運用を行う。
- **ハイブリッド運用**: 機密データを取り扱うチャット・RAG処理はローカルLLMへ、機密情報を含まない広報画像やビジュアル作成処理は最新のクラウド画像生成APIへ自動振り分けする多層防御ポリシーを容易に確立できる。

---

## 6. 実装仕様および構成パラダイム

### 6.1 LiteLLM Proxy構成定義例（`proxy/litellm_config.yaml`）
```yaml
model_list:
  # ローカル独立ノードで動作するStable Diffusion 3.5
  - model_name: local-sd3.5
    litellm_params:
      model: xinference/stabilityai/stable-diffusion-3.5-large
      api_base: http://xinference:9997/v1
      api_key: "anything"
      model_info:
        mode: image_generation

  # 商用クラウドAPI (OpenAI GPT-Image-1)
  - model_name: gpt-image-1
    litellm_params:
      model: openai/gpt-image-1
      api_key: os.environ/OPENAI_API_KEY
      model_info:
        mode: image_generation

  # 抽象化エイリアスモデル（自動フォールバック設定付き）
  - model_name: standard-image-gen
    litellm_params:
      model: xinference/stabilityai/stable-diffusion-3.5-large
      api_base: http://xinference:9997/v1
    fallbacks: ["gpt-image-1"]

router_settings:
  routing_strategy: usage-based-routing-v2
  timeout: 600

general_settings:
  master_key: os.environ/LITELLM_MASTER_KEY
```

### 6.2 分離型コンテナ構成定義例（`docker-compose.yml` 抜粋）
```yaml
version: '3.8'

services:
  # LiteLLM AI Gateway (プロキシ層)
  litellm-proxy:
    image: ghcr.io/berriai/litellm:main-latest
    container_name: open-genai-litellm
    ports:
      - "4000:4000"
    environment:
      - LITELLM_MASTER_KEY=${LITELLM_MASTER_KEY}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
    volumes:
      - ./proxy/litellm_config.yaml:/app/config.yaml
    command: ["--config", "/app/config.yaml", "--port", "4000"]
    restart: always

  # 切り離された独立ローカル推論ノード (Xinference)
  xinference:
    image: xprobe/xinference:latest
    container_name: open-genai-xinference
    ports:
      - "9997:9997"
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: all
              capabilities: [gpu]
    restart: always

  # open-genai コアバックエンド API
  backend:
    build: ./backend
    container_name: open-genai-backend
    environment:
      - LLM_GATEWAY_URL=http://litellm-proxy:4000/v1
      - IMAGE_GEN_MODEL=standard-image-gen
      - SEAWEEDFS_ENDPOINT=http://seaweedfs:8333
    depends_on:
      - litellm-proxy
      - seaweedfs
```

### 6.3 バックエンドの抽象化画像生成処理（Python実装例）
```python
from openai import OpenAI
import os

# LiteLLM Proxyを唯一の標準エンドポイントとして接続
client = OpenAI(
    base_url=os.getenv("LLM_GATEWAY_URL", "http://litellm-proxy:4000/v1"),
    api_key=os.getenv("LITELLM_MASTER_KEY", "sk-1234")
)

def process_image_generation(prompt: str, size: str = "1024x1024") -> str:
    # 接続先のバックエンドやプロバイダ種別を意識せずOpenAI標準仕様で呼び出し
    response = client.images.generate(
        model=os.getenv("IMAGE_GEN_MODEL", "standard-image-gen"),
        prompt=prompt,
        size=size,
        response_format="b64_json"
    )

    # 返却されたBase64バイナリを取得してSeaweedFSへアップロード
    b64_data = response.data[0].b64_json
    signed_url = save_to_seaweedfs_and_sign(b64_data)

    return signed_url
```

---

## 7. 結論および推奨設計指針

本調査結果に基づき、open-genaiプロジェクトの継続的発展に向けた最終提言を以下の3点に集約する。

1. **LiteLLM Proxyによる画像生成インターフェースの標準化**:
   画像生成エンドポイントをLiteLLM経由のOpenAI API規格（`/v1/images/generations`）へ完全移行することを強く推奨する。これにより、アプリケーション側からプロバイダ固有の分岐コードが完全に追放され、モデルの追加・変更に対する保守コストが激減する。
2. **推論エンジンの完全分離とステートレス化**:
   ローカルLLM（Ollama/vLLM）およびローカル画像生成（Xinference/ComfyUI等）を、コアアプリケーションスタックから独立したAPIサービスとして再構築すべきである。このデカップリングにより、GPUリソースの独立スケール、耐障害性の向上、および本番/検証/閉域網環境に対する柔軟な適応が可能となる。
3. **段階的な導入ロードマップの実行**:
   移行作業は三段階で進めることが推奨される。まず第一段階としてLiteLLM Proxyコンテナをスタックに追加して既存LLM呼び出しを集約し、第二段階で独立させたローカル画像生成エンジンをプロキシ配下に接続してSeaweedFS永続化パイプラインを確立し、最終段階で `modelpolicy-app` や `audit-app` と連携した動的フォールバックおよび利用制御ルールを適用する。

このアーキテクチャ刷新を実行することで、open-genaiはガバメントAIとしての強固なセキュリティとデータ主権を保持しながら、急速に進化するマルチモーダルAI技術を即座に吸収できる極めて柔軟かつ堅牢な基盤へと進化を遂げることとなる。
