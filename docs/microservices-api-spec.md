# 📋 AI マイクロサービス群 API 技術仕様書

本ドキュメントでは、OpenGENAI において稼働中、および次期候補となるすべての AI マイクロサービス（音声認識、画像生成、埋め込み、パース、翻訳、PIIフィルタ）の具体的な API 仕様（エンドポイント、リクエスト、レスポンス）を一堂に集約して整理します。

---

## 🛠️ 1. 稼働中マイクロサービス (As-Is)

### 🎙️ 1.1 音声認識 (Whisper) 系統

#### ① `whisper-app` (中継・認証層)
バックエンド（`backend`）からHMAC認証を経て呼び出されるエンドポイントです。

* **Endpoint**: `/invoke`
* **Method**: `POST`
* **Content-Type**: `application/json`
* **Headers**:
  - `x-api-key`: `RAG_API_KEY` (認証キー)

##### リクエストボディ (JSON)
```json
{
  "inputs": {
    "language": "ja",
    "files": [
      {
        "files": [
          {
            "filename": "test.wav",
            "content": "UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAAAAAA=="
          }
        ]
      }
    ]
  }
}
```

##### レスポンス (JSON - `200 OK`)
```json
{
  "outputs": "文字起こしされたテキスト結果がここに返却されます。"
}
```

---

#### ② `local-whisper-api` (推論エンジン層)
OpenAI 互換の Speech-to-Text 仕様に準拠した推論エンドポイントです。

* **Endpoint**: `/v1/audio/transcriptions`
* **Method**: `POST`
* **Content-Type**: `multipart/form-data`

##### リクエストパラメータ (Form Data)
* `file` (File, **必須**): 音声ファイル（`.wav`, `.mp3` 等）。
* `model` (string, 任意): モデル名（`kotoba-tech/kotoba-whisper-v1.0-faster` 等）。

##### レスポンス (JSON - `200 OK`)
```json
{
  "text": "こんにちは、音声認識のテストです。"
}
```

---

### 🎨 1.2 画像生成 (Stable Diffusion) 系統

#### ① `sd-app` (中継・認証層)
バックエンド（`backend`）からHMAC認証を経て呼び出されるエンドポイントです。

* **Endpoint**: `/invoke`
* **Method**: `POST`
* **Content-Type**: `application/json`
* **Headers**:
  - `x-api-key`: `RAG_API_KEY` (認証キー)

##### リクエストボディ (JSON)
```json
{
  "inputs": {
    "prompt": "A beautiful white cat",
    "negative_prompt": "blurry, low quality",
    "size": 512,
    "steps": 4
  }
}
```

##### レスポンス (JSON - `200 OK`)
```json
{
  "outputs": "プロンプト「A beautiful white cat」で画像を生成しました（モデル: imagen-4）。",
  "artifacts": [
    {
      "content": "iVBORw0KGgoAAAANSUhEUgAA...",
      "display_name": "generated_1.png"
    }
  ]
}
```

---

#### ② `local-sd-api` (推論エンジン層)
OpenAI 互換の Image Generation 仕様に準拠した推論エンドポイントです。

* **Endpoint**: `/v1/images/generations`
* **Method**: `POST`
* **Content-Type**: `application/json`

##### リクエストボディ (JSON)
```json
{
  "prompt": "A beautiful white cat",
  "size": "512x512",
  "n": 1,
  "response_format": "b64_json"
}
```

##### レスポンス (JSON - `200 OK`)
```json
{
  "created": 1719999999,
  "data": [
    {
      "b64_json": "iVBORw0KGgoAAAANSUhEUgAA..."
    }
  ]
}
```

---

### 📊 1.3 日本語埋め込み (RAG Embedding) 系統

#### ① `embedding-jp-api` (推論エンジン層)
OpenAI 互換の Embeddings 仕様に準拠した推論エンドポイントです。

* **Endpoint**: `/v1/embeddings`
* **Method**: `POST`
* **Content-Type**: `application/json`

##### リクエストボディ (JSON)
```json
{
  "input": [
    "源内プロジェクトの進捗を確認します。",
    "ローカル閉域網での運用テストを行います。"
  ],
  "model": "cl-nagoya/ruri-v3-30m"
}
```

##### レスポンス (JSON - `200 OK`)
```json
{
  "object": "list",
  "data": [
    {
      "object": "embedding",
      "index": 0,
      "embedding": [0.0123, -0.0456, 0.0789]
    },
    {
      "object": "embedding",
      "index": 1,
      "embedding": [0.0987, -0.0654, 0.0321]
    }
  ],
  "model": "cl-nagoya/ruri-v3-30m",
  "usage": {
    "prompt_tokens": 18,
    "total_tokens": 18
  }
}
```

---

## 🚀 2. 次期候補マイクロサービス (To-Be / 構想)

### 📂 2.1 ドキュメント抽出・パースエンジン (`document-parser-api`)

#### ① 汎用ドキュメントパース API

* **Endpoint**: `/v1/parse`
* **Method**: `POST`
* **Content-Type**: `multipart/form-data`

##### リクエストパラメータ (Form Data)
* `file` (File, **必須**): 解析対象ファイル（`.pdf`, `.docx`, `.xlsx`, `.pptx`, `.txt`等）。
* `strategy` (string, 任意): `"auto"`, `"fast"`, `"hi_res"`。
* `ocr_languages` (string, 任意, 既定: `"jpn+eng"`): OCR処理用の言語コード。
* `extract_tables` (boolean, 任意, 既定: `false`): 表構造をMarkdown/HTMLで抽出するかどうか。

##### レスポンス (JSON - `200 OK`)
```json
{
  "filename": "project_report.pdf",
  "mime_type": "application/pdf",
  "pages_count": 5,
  "elements": [
    {
      "element_id": "elem_001",
      "type": "Title",
      "text": "源内プロジェクト進捗報告書",
      "metadata": { "page_number": 1 }
    },
    {
      "element_id": "elem_002",
      "type": "Table",
      "text": "| 開発フェーズ | 進捗率 |\n|---|---|\n| 音声認識 | 100% |",
      "metadata": {
        "page_number": 2,
        "text_as_html": "<table>...</table>"
      }
    }
  ],
  "full_text": "源内プロジェクト進捗報告書\n\n..."
}
```

---

#### ② パース ＆ チャンク分割同時実行 API

* **Endpoint**: `/v1/parse/chunk`
* **Method**: `POST`
* **Content-Type**: `multipart/form-data`

##### リクエストパラメータ (Form Data)
* `file` (File, **必須**): 解析対象ファイル。
* `chunking_strategy` (string, 任意, 既定: `"by_title"`): `"by_title"`, `"basic"`。
* `max_characters` (integer, 任意, 既定: `500`): チャンク最大文字数。
* `overlap_characters` (integer, 任意, 既定: `50`): チャンク重複文字数。

##### レスポンス (JSON - `200 OK`)
```json
{
  "filename": "project_report.pdf",
  "chunks": [
    {
      "chunk_id": "chunk_001",
      "text": "源内プロジェクト進捗報告書\n本プロジェクトは、完全ローカル閉域網での運用を目指します。",
      "metadata": { "page_number": 1, "section": "概要" }
    }
  ]
}
```

---

### 🌐 2.2 日本語・多言語翻訳推論エンジン (`local-translate-api`)

* **Endpoint**: `/v1/translate`
* **Method**: `POST`
* **Content-Type**: `application/json`

##### リクエストボディ (JSON)
```json
{
  "q": "Good morning. Let's begin the meeting.",
  "source": "en",
  "target": "ja",
  "format": "text"
}
```

##### レスポンス (JSON - `200 OK`)
```json
{
  "translatedText": "おはようございます。ミーティングを始めましょう。",
  "detectedSourceLanguage": "en"
}
```

---

### 🛡️ 2.3 個人情報匿名化フィルタ (`pii-filter-api`)

* **Endpoint**: `/v1/pii/redact`
* **Method**: `POST`
* **Content-Type**: `application/json`

##### リクエストボディ (JSON)
```json
{
  "text": "私の名前は山田太郎です。電話番号は090-1234-5678です。",
  "mask_token": "[MASK]"
}
```

##### レスポンス (JSON - `200 OK`)
```json
{
  "redacted_text": "私の名前は[MASK]です。電話番号は[MASK]です。",
  "entities": [
    {
      "entity_type": "PERSON",
      "text": "山田太郎"
    },
    {
      "entity_type": "PHONE_NUMBER",
      "text": "090-1234-5678"
    }
  ]
}
```
