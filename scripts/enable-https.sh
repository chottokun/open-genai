#!/usr/bin/env bash
# HTTPS 有効化ワンタッチ自動設定スクリプト
# 使い方:
#   bash scripts/enable-https.sh [DOMAIN] [PORT]
# 例:
#   bash scripts/enable-https.sh your-domain.local 8443

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "${PROJECT_ROOT}"

# 1. ドメイン名およびポートの決定
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
PORT="${2:-8443}"

echo "=========================================================="
echo "🔒 HTTPS 有効化セットアップを開始します"
echo "  - 対象ドメイン: ${DOMAIN}"
echo "  - 公開 HTTPS ポート: ${PORT}"
echo "=========================================================="

# 2. 自己署名証明書の生成
echo "1. 証明書を生成中..."
bash "${PROJECT_ROOT}/proxy/certs/generate-selfsigned.sh" "${DOMAIN}"

# 3. docker-compose.yml の更新（バックアップ作成付き）
echo "2. docker-compose.yml のプロキシ設定を HTTPS 仕様に切り替え中..."
COMPOSE_FILE="${PROJECT_ROOT}/docker-compose.yml"
if [ ! -f "${COMPOSE_FILE}.bak" ]; then
  cp "${COMPOSE_FILE}" "${COMPOSE_FILE}.bak"
fi

python3 -c "
import re

path = '${COMPOSE_FILE}'
with open(path, 'r') as f:
    content = f.read()

# proxy サービスセクションを置換
old_proxy_pattern = r'  proxy:\n    image: nginx:[^\n]+\n    container_name: open-genai-proxy\n    ports:\n      - \"[^\"]+\"\n    volumes:\n      - ./proxy/nginx\.http\.conf:/etc/nginx/nginx\.conf:ro'
new_proxy_block = '''  proxy:
    image: nginx:1.27-alpine
    container_name: open-genai-proxy
    ports:
      - \"\${PROXY_HTTP_PORT:-80}:80\"
      - \"\${PROXY_HTTPS_PORT:-${PORT}}:443\"
    volumes:
      - ./proxy/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./proxy/certs:/etc/nginx/certs:ro'''

if './proxy/nginx.http.conf' in content:
    content = re.sub(old_proxy_pattern, new_proxy_block, content)
    with open(path, 'w') as f:
        f.write(content)
    print('  - docker-compose.yml を HTTPS 設定に更新しました。')
else:
    print('  - docker-compose.yml はすでに HTTPS 用設定になっているか、変更の必要がありません。')
"

# 4. .env の PUBLIC_URL 更新
echo "3. .env の PUBLIC_URL を更新中..."
NEW_PUBLIC_URL="https://${DOMAIN}:${PORT}"
if [ "${PORT}" = "443" ]; then
  NEW_PUBLIC_URL="https://${DOMAIN}"
fi

if [ -f "${ENV_FILE}" ]; then
  if grep -q '^PUBLIC_URL=' "${ENV_FILE}"; then
    sed -i "s|^PUBLIC_URL=.*|PUBLIC_URL=${NEW_PUBLIC_URL}|" "${ENV_FILE}"
  else
    echo "PUBLIC_URL=${NEW_PUBLIC_URL}" >> "${ENV_FILE}"
  fi
  echo "  - PUBLIC_URL=${NEW_PUBLIC_URL} に設定しました。"
fi

# 5. コンテナの反映・再起動
echo "4. Nginx プロキシコンテナを再起動中..."
docker compose up -d proxy

echo "=========================================================="
echo "✅ HTTPS 有効化が完了しました！"
echo "  アクセス URL: ${NEW_PUBLIC_URL}/"
echo "=========================================================="
