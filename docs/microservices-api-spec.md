# 📋 次期マイクロサービス候補 API 技術仕様書

本ドキュメントでは、将来的なマイクロサービス化（外出し）に向けて設計する各コンテナの具体的な API 仕様（エンドポイント、リクエスト、レスポンス）を規定します。インターフェースを事前に定義することで、次の実装フェーズへのスムーズな移行を担保します。

---

## 📂 1. ドキュメント構造化抽出・パースエンジン (`document-parser-api`)

アップロードされた各種ドキュメント（PDF, Word, Excel, PowerPoint, 画像等）を解析し、プレーンテキスト、論理構造（タイトル、段落、表など）、およびメタデータを抽出するための API です。

### ① 汎用ドキュメントパース API

ドキュメントを解析し、構造化された要素（Elements）の配列とメタデータを返却します。

* **Endpoint**: `/v1/parse`
* **Method**: `POST`
* **Content-Type**: `multipart/form-data`

#### リクエストパラメータ (Form Data)

| パラメータ名 | タイプ | 必須/任意 | 既定値 | 説明 |
| :--- | :--- | :--- | :--- | :--- |
| `file` | File | **必須** | - | 解析対象のファイル（`.pdf`, `.docx`, `.xlsx`, `.pptx`, `.txt`, `.png`, `.jpg`等）。 |
| `strategy` | string | 任意 | `"auto"` | 解析手法を指定。 `"fast"` (テキスト直接抽出), `"ocr_only"` (OCRのみ), `"hi_res"` (レイアウト解析＋OCR)。 |
| `ocr_languages` | string | 任意 | `"jpn+eng"` | OCR処理時に使用する Tesseract 準拠の言語コード（`+` で複数連結）。 |
| `extract_tables` | boolean | 任意 | `false` | PDFや画像内の表構造を Markdown/HTML 形式として明示的に抽出するかどうか。 |

#### レスポンス (JSON - `200 OK`)

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
      "metadata": {
        "page_number": 1
      }
    },
    {
      "element_id": "elem_002",
      "type": "NarrativeText",
      "text": "本プロジェクトは、完全ローカル閉域網での運用を前提としたAIマイクロサービス群の構築を目指します。",
      "metadata": {
        "page_number": 1
      }
    },
    {
      "element_id": "elem_003",
      "type": "Table",
      "text": "| 開発フェーズ | 進捗率 | 状態 |\n|---|---|---|\n| 音声認識 (Whisper) | 100% | 完了 |\n| 画像生成 (Stable Diffusion) | 100% | 完了 |",
      "metadata": {
        "page_number": 2,
        "text_as_html": "<table><thead><tr><th>開発フェーズ</th><th>進捗率</th><th>状態</th></tr></thead><tbody><tr><td>音声認識 (Whisper)</td><td>100%</td><td>完了</td></tr><tr><td>画像生成 (Stable Diffusion)</td><td>100%</td><td>完了</td></tr></tbody></table>"
      }
    }
  ],
  "full_text": "源内プロジェクト進捗報告書\n\n本プロジェクトは、完全ローカル閉域網での...\n..."
}
```

---

### ② パース ＆ チャンク分割同時実行 API

RAG（Retrieval-Augmented Generation）への投入を想定し、パースと同時にセマンティック構造（タイトルや段落区切り）に基づいたチャンク分割を行い、即座にベクトル化可能な状態のテキストブロックの配列を返却します。

* **Endpoint**: `/v1/parse/chunk`
* **Method**: `POST`
* **Content-Type**: `multipart/form-data`

#### リクエストパラメータ (Form Data)

| パラメータ名 | タイプ | 必須/任意 | 既定値 | 説明 |
| :--- | :--- | :--- | :--- | :--- |
| `file` | File | **必須** | - | 解析対象のファイル。 |
| `chunking_strategy` | string | 任意 | `"by_title"` | チャンク分割手法を指定。 `"by_title"` (章・セクション等の見出し構造で分割), `"basic"` (固定文字数で分割)。 |
| `max_characters` | integer | 任意 | `500` | 1チャンクあたりの最大文字数。 |
| `overlap_characters` | integer | 任意 | `50` | 前後のチャンクと重複させる文字数。 |

#### レスポンス (JSON - `200 OK`)

```json
{
  "filename": "project_report.pdf",
  "chunks": [
    {
      "chunk_id": "chunk_001",
      "text": "源内プロジェクト進捗報告書\n本プロジェクトは、完全ローカル閉域網での運用を前提としたAIマイクロサービス群の構築を目指します。",
      "metadata": {
        "page_number": 1,
        "section": "プロジェクト概要"
      }
    },
    {
      "chunk_id": "chunk_002",
      "text": "表データ: 開発フェーズ | 進捗率 | 状態\n音声認識 (Whisper) | 100% | 完了\n画像生成 (Stable Diffusion) | 100% | 完了",
      "metadata": {
        "page_number": 2,
        "section": "進捗表"
      }
    }
  ]
}
```

---

## 🌐 2. 日本語・多言語翻訳推論エンジン (`local-translate-api`)

外部の LLM にデータを送信することなく、ローカル環境の専用翻訳モデル（例： `facebook/nllb-200` や `Fugumt` など）を用いてテキストを安全・高速に相互翻訳するための API です。

* **Endpoint**: `/v1/translate`
* **Method**: `POST`
* **Content-Type**: `application/json`

#### リクエストボディ (JSON)

```json
{
  "q": "Good morning. Let's begin the daily meeting.",
  "source": "en",
  "target": "ja",
  "format": "text"
}
```

* `q` (string, **必須**): 翻訳したい原文。
* `source` (string, **必須**): 翻訳元の言語コード（ISO 639-1 / 例: `"en"`, `"ja"` 等）。
* `target` (string, **必須**): 翻訳先の言語コード。
* `format` (string, 任意, 既定: `"text"`): 原文のフォーマット（`"text"` または `"html"`）。

#### レスポンス (JSON - `200 OK`)

```json
{
  "translatedText": "おはようございます。デイリーミーティングを始めましょう。",
  "detectedSourceLanguage": "en"
}
```

---

## 🛡️ 3. 個人情報匿名化フィルタ (`pii-filter-api`)

外部クラウド LLM へ送信する前に、プロンプトテキスト内の機微な個人識別情報（PII: 住所、氏名、電話番号、個人番号、クレジットカード番号など）を検出し、自動で匿名化（マスク処理）するための API です。

* **Endpoint**: `/v1/pii/redact`
* **Method**: `POST`
* **Content-Type**: `application/json`

#### リクエストボディ (JSON)

```json
{
  "text": "私の名前は山田太郎です。東京都千代田区1-1に住んでおり、電話番号は090-1234-5678です。",
  "language": "ja",
  "mask_token": "[MASK]"
}
```

* `text` (string, **必須**): マスクを適用したいプロンプト原文。
* `language` (string, 任意, 既定: `"ja"`): 原文の言語。
* `mask_token` (string, 任意, 既定: `"[MASK]"`): マスク部分に置き換えるトークン（`"[PII]"`, `"<REDACTED>"` 等も指定可能）。

#### レスポンス (JSON - `200 OK`)

```json
{
  "redacted_text": "私の名前は[MASK]です。東京都[MASK]に住んでおり、電話番号は[MASK]です。",
  "entities": [
    {
      "entity_type": "PERSON",
      "start": 6,
      "end": 10,
      "text": "山田太郎"
    },
    {
      "entity_type": "LOCATION",
      "start": 15,
      "end": 22,
      "text": "千代田区1-1"
    },
    {
      "entity_type": "PHONE_NUMBER",
      "start": 32,
      "end": 45,
      "text": "090-1234-5678"
    }
  ]
}
```
