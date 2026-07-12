# プロジェクト開発ルール (open-genai)

## 🌐 外部アクセス・SAML 認証ホスト設定の注意点

本プロジェクトで Nginx 単一入口（リバースプロキシ）経由で外部ホスト（独自ドメインやローカルIP）からアクセス可能にする場合、以下の仕様と設定を厳守すること。

1. **`PUBLIC_URL` の指定**
   * 外部からブラウザでアクセスするホスト名（例: `http://your-domain.local`）をルートの `.env` の `PUBLIC_URL` に必ず指定すること。これにより、Keycloakのログイン遷移ホスト名が自動で解決される。

2. **SAML EntityID (Client ID) の固定**
   * `docker-compose.yml` 内の `SAML_SP_ENTITY_ID` は必ず `http://localhost/api/auth/saml/metadata` に固定すること。
   * これを `PUBLIC_URL` 等に基づいて動的に変更すると、Keycloak 側の登録クライアントIDと不一致になり、`client_not_found` (Invalid Request) エラーになる。

3. **ACS / SLS URL の動的バインド**
   * バックエンドの [auth.py](file:///home/nobuhiko/Project/open-genai/backend/app/auth.py) 内の `build_saml_auth` では、リクエスト時の `Host` ヘッダから ACS (Assertion Consumer Service) URL 和 SLS (Single Logout) URL を動的に生成する。
   * これにより `localhost` 固定リダイレクトが防がれ、アクセス元の外部ホストに自動でリダイレクトされる。この動的バインドロジックを改変・破壊しないこと。

4. **Keycloak 側のリダイレクトワイルドカード許可**
   * [realm-open-genai.json](file:///home/nobuhiko/Project/open-genai/keycloak/import/realm-open-genai.json) の SAML クライアント定義の `redirectUris` には、必ず `*` (ワイルドカード) を追加すること。また、固定値の `saml_assertion_consumer_url_post` などの属性は空にしておくこと。これにより、動的なホスト転送が Keycloak に拒否されるのを防ぐ。

## 📝 ドキュメント記述におけるセキュリティ・プライバシー保護ルール

1. **例示用ドメイン・ホスト名の一貫した使用**
   * `docs/` 配下のガイドラインや README などの各種設計ドキュメントを記述・編集する際、開発マシンや特定の環境で一時的に使用している具体的なホスト名やドメイン名（例: `blue-two.local` や特定の社内IPアドレス等）をドキュメント内に書き残さないこと。
   * 接続先ホストの設定例を示す場合は、必ず `your-domain.local` や `genai.example.com` などの一般的な例示用ドメイン、もしくは `<YOUR_DOMAIN_OR_IP>` などのプレースホルダー表記に統一・マスクすること。

