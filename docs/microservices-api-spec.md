# 📋 AI マイクロサービス群 API 技術仕様書

本ドキュメントでは、OpenGENAI において稼働中、および次期候補となるすべての AI マイクロサービス（音声認識、画像生成、日本語埋め込み、RAGナレッジ、文書パース、翻訳、PIIフィルタ）の具体的な API 仕様（エンドポイント、リクエスト、レスポンス）を一堂に集約して整理します。

---

## 🛠️ 1. 稼働中マイクロサービス (As-Is / 現状仕様)

### 🎙️ 1.1 音声認識 (Whisper) 系統

#### ① `whisper-app` (中継・認証層)
バックエンド（`backend`）からHMAC認証を経て呼び出される中継ゲートウェイAPIです。

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
            "filename": "meeting_record.wav",
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
  "outputs": "**文字起こし結果 (ローカルAPI)**:\n\n本日の打合せ内容について録音します。"
}
```

---

#### ② `local-whisper-api` (推論エンジン層)
OpenAI 互換の Speech-to-Text 仕様に準拠したローカル推論 API です。

* **Endpoint**: `/v1/audio/transcriptions`
* **Method**: `POST`
* **Content-Type**: `multipart/form-data`

##### リクエストパラメータ (Form Data)
* `file` (File, **必須**): 音声ファイル（`.wav`, `.mp3` 等）。
* `language` (string, 任意): 対象言語コード。未指定時は `"auto"`（自動判定）。

##### レスポンス (JSON - `200 OK`)
```json
{
  "text": "本日の打合せ内容について録音します。"
}
```

---

### 🎨 1.2 画像生成 (Stable Diffusion) 系統

#### ① `sd-app` (中継・認証層)
バックエンド（`backend`）からHMAC認証を経て呼び出される中継ゲートウェイAPIです。

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
OpenAI 互換の Image Generation 仕様に準拠したローカル推論 API です。

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
OpenAI 互換の Embeddings 仕様に準拠したローカルベクトル化 API です。

* **Endpoint**: `/v1/embeddings`
* **Method**: `POST`
* **Content-Type**: `application/json`

##### リクエストボディ (JSON)
```json
{
  "input": [
    "源内プロジェクトの進捗を確認します。"
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
    }
  ],
  "model": "cl-nagoya/ruri-v3-30m",
  "usage": {
    "prompt_tokens": 9,
    "total_tokens": 9
  }
}
```

---

### 📂 1.4 RAG ナレッジ管理・検索 (`rag-app`) 系統

バックエンドからチーム内ナレッジの登録・削除、およびRAG検索質問を行うための多機能 API です。

* **Endpoint**: `/invoke`
* **Method**: `POST`
* **Content-Type**: `application/json`
* **Headers**:
  - `x-api-key`: `RAG_API_KEY` (認証キー)
  - `x-user-id`: 操作ユーザーのUUID
  - `x-user-groups`: 所属グループ名（カンマ区切り。管理者権限判定に `SystemAdminGroup` を使用）
  - `x-scope`: チームのスコープUUID（データの論理隔離境界）
  - `x-user-ts`: リクエストのタイムスタンプ
  - `x-user-sig`: HMAC内部シグネチャ

#### ① 通常のRAG質問応答 (`action: "ask"`)
RAGを利用した質問応答を行います。添付ファイルを一時的にロードして回答させることも可能です。

##### リクエストボディ (JSON)
```json
{
  "inputs": {
    "action": "ask",
    "question": "源内プロジェクトの特徴は何ですか？",
    "store_mode": "ephemeral",
    "top_k": 4,
    "tags": ["仕様", "開発"],
    "files": []
  }
}
```
* `store_mode`: `"ephemeral"` (添付ファイルを回答生成時のみ一時利用、ナレッジに保存しない) または `"permanent"` (添付ファイルをナレッジとしてこのスコープへ永続蓄積する)。

##### レスポンス (JSON - `200 OK`)
```json
{
  "outputs": "Open GENAI（源内）は、完全ローカル環境でのAI運用を可能にするプロジェクトです [1]。\n\n---\n**参照ドキュメント**\n- [1] Open GENAI README (類似度: 0.895)"
}
```

---

#### ② ナレッジへのドキュメント永続登録 (`action: "add_docs"`)
アップロードされたファイルをパースしてベクトル化し、ナレッジベースに永続登録します。

##### リクエストボディ (JSON)
```json
{
  "inputs": {
    "action": "add_docs",
    "new_tags": "マニュアル,仕様書",
    "files": [
      {
        "files": [
          {
            "filename": "guide.txt",
            "content": "44Gu44Go44Gw44Oq44O844Kv44Gu57S55LuL"
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
  "outputs": "ナレッジに登録しました（タグ: マニュアル, 仕様書）（3 チャンク）。\n\n- guide.txt"
}
```

---

#### ③ Web URL の取り込みと自動更新登録 (`action: "add_url"`)
指定された Web ページのテキストをクローリング・解析し、ナレッジへ登録して自動巡回更新の対象に追加します（管理者限定）。

##### リクエストボディ (JSON)
```json
{
  "inputs": {
    "action": "add_url",
    "new_url": "https://genai.example.com/guide.html",
    "new_tags": "外部URL,ガイド"
  }
}
```

##### レスポンス (JSON - `200 OK`)
```json
{
  "outputs": "URL を取り込み、自動更新の対象に登録しました（タグ: 外部URL, ガイド）。\n\n- 源内導入ガイド\n- 5 チャンク登録"
}
```

---

#### ④ 登録ドキュメント一覧の取得 (`action: "list_sources"`)
現在このスコープに登録されているドキュメントとチャンク数の一覧を取得します。

##### リクエストボディ (JSON)
```json
{
  "inputs": {
    "action": "list_sources",
    "tags": []
  }
}
```

##### レスポンス (JSON - `200 OK`)
```json
{
  "outputs": "## 登録済みドキュメント（このチーム）\n\n- guide.txt（3 チャンク）\n- https://genai.example.com/guide.html（5 チャンク）"
}
```

---

#### ⑤ 登録ドキュメントの削除 (`action: "delete_source"`)
指定されたドキュメントのベクトルをナレッジベースから削除します。

##### リクエストボディ (JSON)
```json
{
  "inputs": {
    "action": "delete_source",
    "document": "guide.txt"
  }
}
```

##### レスポンス (JSON - `200 OK`)
```json
{
  "outputs": "ドキュメント「guide.txt」をナレッジから削除しました。"
}
```

---

#### ⑥ チーム削除時のナレッジ全消去用 API (`/clear_scope`)
チーム削除のライフサイクルに合わせて、バックエンドから直接呼ばれるバルク削除 API です。

* **Endpoint**: `/clear_scope`
* **Method**: `POST`
* **Content-Type**: `application/json`

##### リクエストボディ (JSON)
```json
{
  "scope": "00000000-0000-0000-0000-000000000000"
}
```

##### レスポンス (JSON - `200 OK`)
```json
{
  "cleared": "00000000-0000-0000-0000-000000000000"
}
```

---

## 🚀 2. 次期候補マイクロサービス (To-Be / 構想仕様)

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
