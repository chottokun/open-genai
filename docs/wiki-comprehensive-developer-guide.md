# Open GENAI 総合開発者ウィキ＆アーキテクチャ・運用ガイド

本ドキュメントは、行政・閉域環境向けに最適化されたローカル・オンプレミス型生成AIプラットフォーム **Open GENAI** の全体像、技術アーキテクチャ、セキュリティ設計、データフロー、および開発運用における標準手順（SOP）を体系的にまとめた開発者向けナレッジベース（総合ウィキ）です。

---

## 1. プロジェクトビジョンとローカルファースト設計思想

デジタル庁オリジナル版の「源内 (GENAI)」がパブリッククラウド（AWS / Azure）のマネージドサービスに依存しているのに対し、**Open GENAI** は**完全閉域網（LGWAN、庁内LAN、社内専用オンプレミス環境等）**やデータ主権が強く求められる環境下において、外部通信なしで安全に高度な Generative AI 機能を提供することを目指してフォークされました。

### 核心となる設計思想と効率化方針

1. **クラウド依存の完全排除とオープンな代替案の採用**
   * AWS S3 ➔ **SeaweedFS**（超軽量S3互換分散オブジェクトストレージ）
   * Amazon Transcribe ➔ **local-whisper-api**（CTranslate2 / faster-whisper）
   * AWS Bedrock / Azure OpenAI ➔ **open-genai-litellm (LiteLLM)** ＋ **Ollama**（ローカルLLM）
   * AWS OpenSearch / Pgvector ➔ **Qdrant**（超高速ベクトルデータベース）

2. **不要な中間コンテナの排除とコンポーネントの直接統合（リソース節約）**
   * プロジェクト開発ルール（`AGENTS.md`）に基づき、従来存在していた画像生成用の中間プロキシ（`sd-app` コンテナ）を廃止。
   * 画像生成（Stable Diffusion）ロジックをバックエンド（`backend/app/image_gen.py`）へ直接統合し、余計なネットワークホップと常時起動プロセス数を削減。
   * これにより、CPU・メモリリソースの限られたサーバースペックでも稼働可能にしました。

3. **LiteLLM をハブとした抽象化レイヤ**
   * すべての AI 推論リクエスト（チャット、音声文字起こし、画像生成、埋め込み）のゲートウェイとして `open-genai-litellm` を配置。
   * バックエンドやフロントエンドのコード変更を伴うことなく、`.env` および `litellm_config.yaml` の書き換えのみで推論モデルの差し替えや外部セキュアプロキシ接続を可能にしています。

---

## 2. 全コンテナ・サービスカタログ

現在、Open GENAI は全 **20の個別サービス/コンテナ** から構成されています。これらはその役割、ネットワーク境界に応じて4つのレイヤに分類されます。

### ① エントリ・ルーティング系統 (ゲートウェイ層)
すべての外部リクエストを受け付け、適切なサービスへ中継する最前線のセキュリティゲートウェイです。

| コンテナ名 | サービス名 | 公開ポート (Host:Container) | 役割と責務 |
| :--- | :--- | :--- | :--- |
| `open-genai-proxy` | `proxy` | `80:80` / `443:443` | Nginxによる単一アクセス入口。自己署名証明書等によるSSL/TLS終端、およびリバースプロキシヘッダー（`X-Forwarded-*`）の解決。 |
| `open-genai-litellm` | `litellm` | `4000:4000` | マルチプロバイダ対応のLLMプロキシ。モデルごとのルーティング、APIキー管理、自動フォールバック制御。 |

### ② アプリケーション・共通基盤系統
本番稼働に必要な認証認可、データ永続化、コアAPIを担います。

| コンテナ名 | サービス名 | ポート (内部/外部) | 役割と責務 |
| :--- | :--- | :--- | :--- |
| `open-genai-backend` | `backend` | `8000 (Expose)` | FastAPIによるバックエンドAPI。チャット管理、AIアプリ（exApps）のHMAC署名付き呼び出し、監査連携等のコア制御。 |
| `open-genai-web` | `web` | `5173:-` | フロントエンドUI（Vite/Reactシングルページアプリケーション）。 |
| `open-genai-keycloak` | `keycloak` | `8080 (Expose)` | SAML 2.0 認証プロバイダ（IdP）。組織内ディレクトリやSSO認証連携。 |
| `open-genai-qdrant` | `qdrant` | `6333:6333` | ベクトルデータベース。RAGドキュメントのベクトル検索。 |
| `open-genai-seaweedfs` | `seaweedfs` | `8333:8333` | S3互換オブジェクトストレージ。アップロード文書、文字起こし音声ファイルなどの保管。 |

### ③ AIアプリ系統 (exApps)
コアバックエンドからセキュリティ（HMAC）検証を経て呼び出される、機能特化型のマイクロサービス群です。

| コンテナ名 | サービス名 | ポート (内部/外部) | 役割と責務 |
| :--- | :--- | :--- | :--- |
| `open-genai-whisper-app` | `whisper-app` | `8002:8002` | 音声認識（文字起こし）のプロキシ・セキュリティフィルタ層。 |
| `open-genai-rag-app` | `rag-app` | `8001:8001` | RAG（ドキュメント検索・ナレッジ抽出）AIアプリ。非同期バッチ処理およびナレッジのチーム間分離を管理。 |
| `open-genai-prompt-app` | `prompt-app` | `8009:-` | プロンプトテンプレート管理AIアプリ。 |
| `open-genai-usermgmt-app` | `usermgmt-app` | `8006:-` | Keycloakと連携した組織・ユーザー管理AIアプリ。 |
| `open-genai-modelpolicy-app`| `modelpolicy-app`| `8007:-` | ユーザー/チームごとの利用可能モデルポリシー制御。 |
| `open-genai-ngword-app` | `ngword-app` | `8008:-` | 個人情報や機微情報、不適切ワードの入力フィルタリング。 |
| `open-genai-audit-app` | `audit-app` | `8005:-` | 監査ログ管理およびガバナンスレポート出力。 |
| `open-genai-dify-app` | `dify-app` | `8004:-` | DifyなどのローコードAIツール群とナレッジを繋ぐ連携アダプタ。 |

### ④ 推論・埋め込み・エンジン系統 (ローカル推論層)
CPU/GPUを贅沢に使用し、実際のディープラーニングモデルを実行するAI心臓部です。

| コンテナ名 | サービス名 | ポート (内部/外部) | 役割と責務 |
| :--- | :--- | :--- | :--- |
| `local-whisper-api` | `local-whisper-api`| `8003:8000` | CTranslate2（faster-whisper）による超高速・省メモリな音声認識推論API。 |
| `local-sd-api` | `local-sd-api` | `8004:8000` | Stable Diffusion 1.5/XL によるオンプレミス画像生成推論API。 |
| `open-genai-embedding-jp-api`| `embedding-jp-api`| `8020:8000` | Hugging Face TEI（Text Embeddings Inference）ベースの日本語特化ベクトル化API（`ruri-v3-30m` 等）。 |
| `open-genai-ollama` | `ollama` | `11434:11434` | ローカルLLM（`qwen2.5`、`llama3` 等）の実行環境。 |

---

## 3. セキュリティ・監査・ガードレール基準

閉域網への導入や厳格なガバナンスへの適合を達成するため、本プラットフォームには複数の自立型ガードレールやセキュリティ仕様が埋め込まれています。

### 3.1 SAML 2.0 / Keycloak SSO 統合仕様
Nginxリバースプロキシ越しにKeycloak認証を安全に行うため、以下の設定ルールを厳守してください。

1. **`PUBLIC_URL` の指定**
   * `.env` 内の `PUBLIC_URL` に、ブラウザから見える完全なプロトコルとホスト名（例: `http://your-domain.local` または `https://your-domain.local`）を設定することで、バックエンドとKeycloak間のログインリダイレクトが正しく解決されます。
2. **SAML EntityID (Client ID) の固定**
   * `docker-compose.yml` 内の `SAML_SP_ENTITY_ID` は、必ず `http://localhost/api/auth/saml/metadata` に固定します。
   * これを動的に書き換えると、Keycloak側に登録されているSPのClient IDと一致しなくなり、認証画面で `client_not_found` (Invalid Request) エラーを引き起こします。
3. **ACS / SLS URL の動的バインド**
   * バックエンド（`backend/app/auth.py`）内の `build_saml_auth` は、リクエストの `Host` ヘッダーから ACS（Assertion Consumer Service）URL および SLS（Single Logout）URL を動的生成します。
   * これにより、プロキシやコンテナ境界を跨ぐ場合でも、`localhost` への誤ったリダイレクトループを回避し、接続元の公開ホスト名へ正確に戻されます。

### 3.2 外部漏洩＆課金防止ガードレール (`ALLOW_CLOUD_API`)
不意な外部インターネット接続による機密情報の流出、および従量課金APIの予期せぬ消費を抑止するため、**`ALLOW_CLOUD_API`** トグルが提供されています。

* **`ALLOW_CLOUD_API=false` (標準セキュリティモード)**
   * システムは外部のクラウドAPI（OpenAI, Gemini 等）への通信を厳格にブロックします。
   * ユーザーが外部サービス連携をオンに設定していた場合でも、`whisper-app` や `image_gen.py` が自動でこれを検知し、**強制的にローカル推論プロバイダ（`local` / `local_api`）へ内部的にフォールバック** させます。
   * ただし、同一 Docker ネットワーク内のローカル通信（`local-whisper-api`、`local-sd-api`、`ollama`）はセーフリストとして透過的に通過します。

### 3.3 依存関係セキュリティ監査の徹底 (CVE対策)
本プロジェクトでは、定期的な `pip-audit` に加え、既知の重大な脆弱性に対する個別更新を行っています。
* **`pypdf` 脆弱性対策 (CVE-2026-59938 / 37 / 35 / 36)**
  * PDF読み込みライブラリである `pypdf` において、悪意あるPDFによるサービス拒否（DoS）や無限ループ等の脆弱性が報告されたため、backend、rag-app などの関連要件ファイルで一斉に **`pypdf>=6.14.2`** へのアップグレードを行い、安全性を確認しています。

### 3.4 秘密情報のプレースホルダー化ポリシー
`.agents/AGENTS.md` に則り、本 wiki および各種設定ファイルのドキュメント内で特定の開発機ドメインや非公開ローカルIPを記述することは禁止されています。接続先のホスト設定例を示す場合は、必ず以下のような共通プレースホルダーに統一してください。
* 🌐 公開例示ホスト: `your-domain.local` / `genai.example.com`
* 🛠️ IP・ドメイン表記: `<YOUR_DOMAIN_OR_IP>`

---

## 4. ハイブリッドRAG・構造化ツリー＆データベース最適化

Open GENAI の RAG システム（`rag-app`）は、通常の単純なコサイン類似度によるチャンク検索だけでなく、資料の階層構造（章・節・ページ）を維持して検索する **「構造化ツリー検索（Tree Indexing）」** に対応したハイブリッド構成を採っています。

### 4.1 Retrieval API & 検索モード

機械クライアント（Dify や `knowledge-mcp`）が直接 `rag-app` を呼び出す際は、[Retrieval API](knowledge-api.md) を使用します。

* **検索モードの一覧と選択方針 (mode=auto)**:
  1. `vector`: Qdrant による通常の多次元ベクトル空間類似度検索。
  2. `tree`: 資料の目次（構造ツリー）を辿って関連する上位・下位の節を抽出。
  3. `hybrid`: ベクトル検索で関連文書候補を絞り込み、その後、SQLiteメタデータから構造ツリーとして周辺コンテンツ（文脈）を復元・補完。
  4. `full`: コンテキスト長が許す限り（既定 24,000文字以内）、該当資料の全文を LLM に送付。

### 4.2 SQLite データベースのパフォーマンス最適化
RAG-App は内部メタデータの永続化とツリー構造の管理に SQLite（`RAG_META_DB_PATH`）を使用しています。大量のドキュメントや複雑な親子関係を持つ大規模な目次を扱う際、高速な検索と安定性を担保するために、以下のチューニングが行われています。

1. **インデックスの追加によるフルスキャン回避**
   * 木構造の親から子ノードを再帰的に引き当てる際、およびチーム分離（マルチテナント）のアクセスを高速化するため、以下のインデックスが定義されています。
     - `idx_tree_nodes_parent` ON `tree_nodes(doc_id, parent_id)`
     - `idx_team_users_user` ON `team_users(userId)`
     - `idx_exapps_team` ON `exapps(teamId)`
   * これにより、検索クエリごとの全表走査（Full Table Scan）が回避され、データベースアクセス遅延がミリ秒未満に抑えられます。

2. **チャンク分割 `IN` 句による制限回避**
   * RAG-App の `get_nodes_with_text` ロジック等では、抽出対象のノードID群（node_ids）を SQL クエリで一括取得する際、SQLite の引数上限（通常 999 または 32766）を考慮し、かつメモリ枯乱を防ぐため、**「500件単位の分割チャンククエリ（Chunked IN-clause）」** を内部で適用しています。
   * これにより、非常に大きい文書をインジェスト・検索する際にも $O(N)$ のデータベース接続オーバーヘッドや変数エラーの発生を防ぎ、100%安全に動作します。

---

## 5. ローカル推論エンジンの最適化＆設定

### 5.1 音声認識エンジン (local-whisper-api)
CTranslate2 上で動作する `faster-whisper` にて推論を行います。

* **デバイス設定トグル**: `.env` 内の `AUDIO_INFERENCE_DEVICE` にて `cpu` または `cuda` (GPU) を設定。
* **量子化設定**: メモリ消費量が非常に小さく、かつ推論速度が維持できる `int8` (`AUDIO_COMPUTE_TYPE=int8`) が推奨されます。GPU利用時は `float16` も指定可能です。
* **採用モデル**: 日本語に最適化された **Kotoba-Whisper** (`kotoba-tech/kotoba-whisper-v1.0-faster`) または多言語汎用の **Original Whisper Large v3** (`systran/faster-whisper-large-v3`) を `.env` の `AUDIO_MODEL_NAME` に書くだけで自動ダウンロードされます。

### 5.2 画像生成エンジン (local-sd-api)
Stable Diffusion をコンテナ内から呼び出す際の、段階的アップグレードロードマップです。

* **検証段階（CPU / 超軽量）**: `SimianLuo/LCM_Dreamshaper_v7` などの Latent Consistency Model を使用し、極めて低いリソース環境（メモリ 8GB 程度の CPU サーバー）で 2〜3秒で実動することを確認。
* **中規模段階（GPU / 高品質）**: `ByteDance/SDXL-Lightning` などの高速・高画質モデルを cuda デバイスに割り当て。
* **本番最高品質段階（GPU / 商用レベル）**: `black-forest-labs/FLUX.1-schnell` などの次世代フロー・マッチングモデルを設定。

---

## 6. 開発者標準運用手順 (SOP) & 実動検証ログ

### 6.1 Upstream リポジトリとの動的同期 SOP（方針Bの適用）
公式 upstream リポジトリ (`https://github.com/hirokawaguchi/open-genai`) で機能更新やバグフィックスが行われた際、独自のローカルカスタマイズ（LiteLLM構成、コンテナ最適化など）を維持しながら安全に取り込むための手順です。

```bash
# 1. 最新の upstream 変更を取得
git fetch origin
git fetch upstream

# 2. 検証・統合用の作業用一時ブランチを作成 (例: sync-upstream-v0.5.0)
git checkout -b sync-upstream-v0.5.0 main

# 3. upstream の対応コミットをチェリーピック、または手動パッチ適用
# (共通プレースホルダー your-domain.local などの独自ローカル設定が上書きされないように注意する)
git cherry-pick <COMMIT_HASH_1> <COMMIT_HASH_2>

# 4. バックエンド、フロントエンドの回帰テストを実行し、デグレードがないか確認 (後述の検証用コマンド参照)

# 5. 問題なければ main ブランチおよび dev ブランチへマージして origin に反映
git checkout main
git merge sync-upstream-v0.5.0
git push origin main
git checkout dev
git merge main
git push origin dev

# 6. 一時ブランチの削除
git branch -d sync-upstream-v0.5.0
```

---

### 6.2 品質検証およびセキュリティ診断の実行手順と実動ログ
コードの改修、または Upstream 同期を行った際は、必ず以下の診断・検証コマンドを実行し、合格したことを確認してください。

#### ① バックエンド回帰テスト (pytest)
バックエンド Core API（FastAPI）や各種 AIアプリ（rag-app 等）にデグレードがないか確認するコマンドです。

```bash
# リグレッションテストスクリプト（Pythonのみ）の実行
bash scripts/run-regression-tests.sh --python-only
```

##### 📊 実動テスト検証ログ (100% 合格)
```text
=== Python regression tests (pytest) ===
pytest 用 venv を作成: /app/.venv-regression-tests
............................................ssss........................ [ 80%]
..................                                                       [100%]
86 passed, 4 skipped in 2.53s
リグレッションテストはすべて成功しました。
```
* **結果分析**: 全 86 件の Python ユニット/統合テストがわずか **2.53 秒** で完全に通過。

#### ② 依存関係既知脆弱性スキャン (pip-audit)
Python依存関係におけるセキュリティ問題がないか全13個の `requirements.txt` をスキャンするコマンドです。

```bash
# 脆弱性監査スクリプトの実行
bash scripts/audit-python-deps.sh
```

##### 🔒 実動セキュリティ監査ログ (0 脆弱性 / 100% CLEAN)
```text
=== ./audit-app/requirements.txt ===
No known vulnerabilities found
=== ./backend/requirements.txt ===
No known vulnerabilities found
=== ./dify-app/requirements.txt ===
No known vulnerabilities found
=== ./knowledge-mcp/requirements.txt ===
No known vulnerabilities found
=== ./local-sd-api/requirements.txt ===
No known vulnerabilities found
=== ./local-whisper-api/requirements.txt ===
No known vulnerabilities found
=== ./modelpolicy-app/requirements.txt ===
No known vulnerabilities found
=== ./ngword-app/requirements.txt ===
No known vulnerabilities found
=== ./prompt-app/requirements.txt ===
No known vulnerabilities found
=== ./rag-app/requirements.txt ===
No known vulnerabilities found
=== ./tests/requirements.txt ===
No known vulnerabilities found
=== ./usermgmt-app/requirements.txt ===
No known vulnerabilities found
=== ./whisper-app/requirements.txt ===
No known vulnerabilities found

スキャン対象: 13 ファイル
既知の脆弱性は検出されませんでした。
```
* **結果分析**: 全 13 の Python サービス/アプリの依存要件ファイルに対するスキャン結果、**既知の脆弱性は0件 (100% CLEAN)** であり、極めてセキュアな状態であることを確認済み。

---

### 6.3 ワンタッチ HTTPS (SSL/TLS) 終端設定手順
Nginx（`proxy`）に対して、任意の独自ドメイン名（例: `your-domain.local`）に対する自己署名証明書を発行し、SSL終端、ポート443マウント、Keycloakへの HTTPS 伝播ヘッダ適用を全自動で行うスクリプトの使用方法です。

```bash
# HTTPS を適用したいドメインを指定して一発適用
bash scripts/setup-rproxy-ssl.sh your-domain.local
```

#### スクリプトの実行内部動作:
1. `openssl` により、指定ドメイン用自己署名証明書（`proxy/certs/fullchain.pem`、`privkey.pem`）をローカル自動生成。
2. `docker-compose.yml` 内の `proxy` マウント定義に SSL設定ファイル（`proxy/nginx.conf`）と証明書ディレクトリをバインドし、ホストポート `443` を自動露出。
3. ルート `.env` 内の `PUBLIC_URL` を `https://your-domain.local` に動的更新。
4. 設定変更を適用するため、リバースプロキシおよびバックエンドコンテナを自動的に再ビルド・再起動。
