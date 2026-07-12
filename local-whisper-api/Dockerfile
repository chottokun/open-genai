FROM python:3.11-slim

WORKDIR /workspace

ENV PYTHONUNBUFFERED=1

# システムパッケージのインストール (curlはヘルスチェック用)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app/ ./app/

# Hugging Face キャッシュ用のディレクトリを用意
RUN mkdir -p /root/.cache/huggingface

EXPOSE 8000

# uvicornで起動
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
