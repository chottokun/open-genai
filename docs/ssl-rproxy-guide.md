# リバースプロキシ方式（R-Proxy）による SSL/TLS 移行ガイド

本ドキュメントでは、既存の HTTP 環境で動作している Keycloak および連携アプリケーション（`open-genai`）を、**リバースプロキシ（Nginx）での SSL 終端（R-Proxy 方式）** により HTTP および HTTPS へ安全に拡張・移行する手順と注意点について解説します。

---

## 1. SSL/TLS 移行時に発生する 5 大トラブルと対策

### ① トークン発行者（`iss` Claim）の不一致エラー
- **現象**: クライアントアプリが JWT を検証する際、`iss` (Issuer) のスキーム（`http://` vs `https://`）不一致により `Invalid Token Issuer` エラーが発生する。
- **原因**: リバースプロキシが `X-Forwarded-Proto: https` ヘッダーを転送していないと、Keycloak は自身が HTTP で呼び出されたと誤認して `http://` のトークンを発行する。
- **対策**: Nginx プロキシで `X-Forwarded-Proto` / `X-Forwarded-Host` を設定し、Keycloak に `KC_PROXY_HEADERS=xforwarded` を指定する。

### ② 管理コンソールからのロックアウト（Require SSL 設定）
- **現象**: Keycloak の管理画面で `Require SSL` を `all requests` に変更した際、管理者自身がログインできなくなる。
- **対策**: プロキシ設定 $\rightarrow$ Keycloak 環境変数 $\rightarrow$ HTTPS アクセス確認の順序を厳守し、検証完了後に `Require SSL` を有効化する。

### ③ Cookie の `Secure` 属性と Mixed Content（混在コンテンツ）問題
- **現象**: 連携フロントエンドアプリが HTTP のまま、Keycloak のみを HTTPS 化した場合、ブラウザが `Secure` Cookie の取り扱いを拒否し、無限リダイレクトが発生する。
- **対策**: フロントエンド・バックエンド・認証プロバイダをリバースプロキシ経由で統一したプロトコル/ドメインで運用する。

### ④ Docker コンテナ間内部通信とパブリック URL の不一致
- **現象**: バックエンドが `http://keycloak:8080` などの内部用 URL で Discovery エンドポイントを取得すると、JWKS 取得やトークン検証に失敗する。
- **対策**: Keycloak の `KC_HOSTNAME_URL` や Nginx リバースプロキシのエンドポイント統一により、外部パブリック FQDN （例: `https://your-domain.local`）経由で矛盾なく解決させる。

### ⑤ クライアント設定（Redirect URIs / Web Origins）の更新漏れ
- **現象**: Keycloak 上の Client 設定に登録されている URI が `http://` のままだと、`Invalid parameter: redirect_uri` エラーが発生する。
- **対策**: Keycloak の Client 設定（Valid Redirect URIs および Web Origins）にワイルドカード (`*`) や `https://your-domain.local/*` を追加する。

---

## 2. 安全な SSL 移行手順（ロードマップ）

### ステップ 1: 自己署名証明書の生成 (検証環境)
検証用に自己署名証明書を発行します。本番環境では認証局（CA）発行の証明書を使用してください。

```bash
bash proxy/certs/generate-selfsigned.sh your-domain.local
```

### ステップ 2: リバースプロキシ（Nginx）の設定
`proxy/nginx.conf` で HTTP (80) と HTTPS (443) の両ポートを受信し、動的プロキシヘッダーを付与します。

```nginx
server {
    listen 80;
    listen 443 ssl;
    ssl_certificate     /etc/nginx/certs/fullchain.pem;
    ssl_certificate_key /etc/nginx/certs/privkey.pem;

    location /api/ {
        proxy_pass http://backend:8000;
        proxy_set_header Host              $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host  $host;
        proxy_set_header X-Forwarded-Port  $server_port;
    }
}
```

### ステップ 3: Keycloak 側のプロキシヘッダー有効化
`docker-compose.yml` で Keycloak に以下の環境変数を追加します。

```yaml
environment:
  KC_PROXY_HEADERS: "xforwarded"
  KC_HTTP_ENABLED: "true"
```

### ステップ 4: `.env` の `PUBLIC_URL` 設定
アクセス先の URL を `.env` に設定します。

```bash
PUBLIC_URL=https://your-domain.local
```

---

## 3. 設定チェックリスト

| チェック項目 | 確認方法 | 判定基準 |
| --- | --- | --- |
| **Issuer URL** | `curl -s https://your-domain.local/kc/realms/open-genai/.well-known/openid-configuration \| jq .issuer` | `https://` で始まっていること |
| **ヘッダー認識** | バックエンド / Keycloak アクセスログ | 送信元の実 IP・プロトコルが解決されていること |
| **セッション Cookie** | ブラウザデベロッパーツール (Application $\rightarrow$ Cookies) | `KEYCLOAK_IDENTITY` 等に `Secure` フラグが付与されていること |

---

## 4. ロックアウト時の緊急復旧手順 (kcadm.sh)

万が一、設定ミスで管理コンソールにログインできなくなった場合は、以下のコマンドで CLI から SSL 要件を無効化できます。

```bash
# 1. Keycloak コンテナに入る
docker exec -it open-genai-keycloak bash

# 2. kcadm.sh でローカルアクセス（http://localhost:8080）経由ログイン
/opt/keycloak/bin/kcadm.sh config credentials \
  --server http://localhost:8080 \
  --realm master \
  --user admin \
  --password admin

# 3. master レルムの sslRequired を none に変更
/opt/keycloak/bin/kcadm.sh update realms/master -s sslRequired=NONE
```
