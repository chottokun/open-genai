FROM python:3.12-slim

WORKDIR /app

ENV PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

# python3-saml は xmlsec のネイティブ依存を必要とする
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
       build-essential pkg-config gcc \
       libxml2-dev libxmlsec1-dev libxmlsec1-openssl xmlsec1 \
    && rm -rf /var/lib/apt/lists/*

# ビルドコンテキストはリポジトリルート（shared/ を共有するため）
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY shared ./shared
COPY backend/app ./app

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
