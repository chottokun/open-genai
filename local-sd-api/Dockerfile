FROM python:3.11-slim

WORKDIR /workspace

ENV PYTHONUNBUFFERED=1

# システムパッケージのインストール
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

# requirements.txt のコピーとインストール
COPY requirements.txt .
RUN pip install --no-cache-dir --default-timeout=1000 --extra-index-url https://download.pytorch.org/whl/cpu -r requirements.txt

# アプリコードのコピー
COPY app/ ./app/

# Hugging Face キャッシュ用のディレクトリ作成
RUN mkdir -p /root/.cache/huggingface

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
