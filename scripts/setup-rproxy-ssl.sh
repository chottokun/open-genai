#!/usr/bin/env bash
# リバースプロキシ (R-Proxy) 方式 SSL/TLS ワンタッチ自動設定スクリプト
# 使い方:
#   bash scripts/setup-rproxy-ssl.sh [DOMAIN]
# 例:
#   bash scripts/setup-rproxy-ssl.sh your-domain.local

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "${PROJECT_ROOT}"

ENV_FILE="${PROJECT_ROOT}/.env"
DEFAULT_DOMAIN="your-domain.local"

if [ -f "${ENV_FILE}" ]; then
  URL_VAL="$(grep -E '^PUBLIC_URL=' "${ENV_FILE}" | cut -d'=' -f2- | tr -d '"' | tr -d "'" || true)"
  if [ -n "${URL_VAL}" ]; then
    EXTRACTED="$(echo "${URL_VAL}" | sed -E 's|https?://||; s|:[0-9]+.*||; s|/.*||')"
    if [ -n "${EXTRACTED}" ] && [ "${EXTRACTED}" != "localhost" ]; then
      DEFAULT_DOMAIN="${EXTRACTED}"
    fi
  fi
fi

DOMAIN="${1:-${DEFAULT_DOMAIN}}"

echo "=========================================================="
echo "🔒 R-Proxy 方式 SSL/TLS セットアップを開始します"
echo "  - 対象ドメイン: ${DOMAIN}"
echo "=========================================================="

# 1. 証明書の自動生成
echo "1. 自己署名証明書を生成中..."
bash "${PROJECT_ROOT}/proxy/certs/generate-selfsigned.sh" "${DOMAIN}"

# 2. docker-compose.yml の更新
echo "2. docker-compose.yml の設定を更新中..."
COMPOSE_FILE="${PROJECT_ROOT}/docker-compose.yml"
python3 -c "
import re, sys

path = '${COMPOSE_FILE}'
with open(path, 'r') as f:
    content = f.read()

# proxy サービスセクションの更新
old_proxy_pattern = r'  proxy:\n    image: nginx:[^\n]+\n    container_name: open-genai-proxy\n    ports:\n      - \"[^\"]+\"\n    volumes:\n      - ./proxy/nginx\.http\.conf:/etc/nginx/nginx\.conf:ro'
new_proxy_block = '''  proxy:
    image: nginx:1.27-alpine
    container_name: open-genai-proxy
    ports:
      - \"\${PROXY_HTTP_PORT:-80}:80\"
      - \"\${PROXY_HTTPS_PORT:-443}:443\"
    volumes:
      - ./proxy/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./proxy/certs:/etc/nginx/certs:ro'''

if './proxy/nginx.http.conf' in content:
    content = re.sub(old_proxy_pattern, new_proxy_block, content)

# keycloak サービスへの KC_PROXY_HEADERS 定義確認
if 'KC_PROXY_HEADERS' not in content:
    content = content.replace('      - KC_HTTP_RELATIVE_PATH=/kc', '      - KC_HTTP_RELATIVE_PATH=/kc\n      - KC_PROXY_HEADERS=xforwarded')

with open(path, 'w') as f:
    f.write(content)

print('  - docker-compose.yml を更新しました。')
"

# 3. .env の PUBLIC_URL 更新
echo "3. .env の PUBLIC_URL を更新中..."
NEW_PUBLIC_URL="https://${DOMAIN}"

if [ -f "${ENV_FILE}" ]; then
  if grep -q '^PUBLIC_URL=' "${ENV_FILE}"; then
    sed -i "s|^PUBLIC_URL=.*|PUBLIC_URL=${NEW_PUBLIC_URL}|" "${ENV_FILE}"
  else
    echo "PUBLIC_URL=${NEW_PUBLIC_URL}" >> "${ENV_FILE}"
  fi
  echo "  - PUBLIC_URL=${NEW_PUBLIC_URL} に更新しました。"
fi

# 4. プロキシとコンテナの反映
echo "4. リバースプロキシおよび関連サービスを再起動中..."
docker compose up -d --force-recreate proxy keycloak backend

echo "=========================================================="
echo "✅ R-Proxy 方式 SSL/TLS セットアップが完了しました！"
echo "  アクセス URL: ${NEW_PUBLIC_URL}/"
echo "=========================================================="
