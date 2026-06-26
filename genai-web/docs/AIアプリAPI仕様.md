# AI アプリ API 仕様

> **注意**: この仕様は2026年03月時点のものであり、試行錯誤中です。業界標準の調査やAI開発事業者等との協議の結果、今後大きく変わる可能性があります。

## 目次

- [概要](#概要)
- [リクエスト形式定義](#リクエスト形式定義)
  - [行政実務用AIアプリに定義するリクエスト形式](#行政実務用aiアプリに定義するリクエスト形式)
  - [テキストフィールド](#テキストフィールド)
  - [数値フィールド](#数値フィールド)
  - [テキストエリア](#テキストエリア)
  - [ファイル](#ファイル)
  - [セレクトボックス](#セレクトボックス)
  - [チェックボックス](#チェックボックス)
  - [ラジオボタン](#ラジオボタン)
  - [hidden](#hidden)
- [会話履歴(疑似チャット)](#会話履歴疑似チャット)
- [サンプル](#サンプル)
- [送出されるリクエスト](#送出されるリクエスト)
  - [注意点](#注意点)
- [レスポンス仕様](#レスポンス仕様)
  - [同期処理の場合](#同期処理の場合)
  - [非同期処理の場合](#非同期処理の場合)

## 概要

源内 Web インターフェースは、行政実務用 AI アプリとして外部の REST API を呼び出すことが可能です。
このページは、「チーム管理」メニューから行政実務用 AI アプリを登録する際に「リクエスト形式」に登録する JSON のフォーマットを解説しています。

## リクエスト形式定義

### 行政実務用 AI アプリに定義するリクエスト形式

リクエスト形式は辞書形式で表現し、API に送出するリクエストのキーを辞書のキーとして設定します。

```json
{
    "Request-key1": <request-definition>,
    "Request-key2": <request-definition>,
    ....
}
```

`<request-definition>` には以下のコンポーネントのいずれかを設定してください。

- [テキストフィールド](#テキストフィールド)
- [数値フィールド](#数値フィールド)
- [テキストエリア](#テキストエリア)
- [ファイル](#ファイル)
- [セレクトボックス](#セレクトボックス)
- [チェックボックス](#チェックボックス)
- [ラジオボタン](#ラジオボタン)
- [hidden](#hidden)

### テキストフィールド

#### 記述例

```json
"Request-key": {
    "type": "text",
    "title": "ラベルに表示されるタイトル",
    "desc": "フィールドの説明文",
    "required": true,
    "min_length": 10,
    "max_length": 1000,
    "default_value": "デフォルト値"
}
```

#### パラメータ一覧

| パラメータ | 要否 | 型 | 備考 |
| --- | --- | --- | --- |
| title | 必須 | 文字列 | |
| desc | 任意 | 文字列 | |
| required | 任意 | 真偽値 | 指定しなかった場合、任意のフィールドとして扱われます |
| min_length | 任意 | 数値 | 負の値は設定できません |
| max_length | 任意 | 数値 | 負の値は設定できません |
| default_value | 任意 | 文字列 | |

### 数値フィールド

#### 記述例

```json
"Request-key": {
    "type": "number",
    "title": "ラベルに表示されるタイトル",
    "desc": "フィールドの説明文",
    "required": true,
    "min": 10,
    "max": 1000,
    "default_value": 100
}
```

#### パラメータ一覧

| パラメータ | 要否 | 型 | 備考 |
| --- | --- | --- | --- |
| title | 必須 | 文字列 | |
| desc | 任意 | 文字列 | |
| required | 任意 | 真偽値 | 指定しなかった場合、任意のフィールドとして扱われます |
| min | 任意 | 数値 | 負の値は設定できません |
| max | 任意 | 数値 | 負の値は設定できません |
| default_value | 任意 | 数値 | |

### テキストエリア

#### 記述例

```json
"Request-key": {
    "type": "textarea",
    "title": "ラベルに表示されるタイトル",
    "desc": "フィールドの説明文",
    "required": true,
    "min_length": 10,
    "max_length": 1000,
    "default_value": "デフォルト値"
}
```

#### パラメータ一覧

| パラメータ | 要否 | 型 | 備考 |
| --- | --- | --- | --- |
| title | 必須 | 文字列 | |
| desc | 任意 | 文字列 | |
| required | 任意 | 真偽値 | 指定しなかった場合、任意のフィールドとして扱われます |
| min_length | 任意 | 数値 | 負の値は設定できません |
| max_length | 任意 | 数値 | 負の値は設定できません |
| default_value | 任意 | 文字列 | |

### ファイル

#### 記述例

```json
"Request-key": {
    "type": "file",
    "title": "ラベルに表示されるタイトル",
    "desc": "フィールドの説明文",
    "required": false,
    "accept": "image/png,image/jpeg",
    "multiple": true,
    "max_size": "4.5MB",
    "max_file_count": 5
}
```

#### パラメータ一覧

| パラメータ | 要否 | 型 | 備考 |
| --- | --- | --- | --- |
| title | 必須 | 文字列 | |
| desc | 任意 | 文字列 | |
| required | 任意 | 真偽値 | 指定しなかった場合、任意のフィールドとして扱われます |
| accept | 任意 | 文字列 | 仕様は [MDN](https://developer.mozilla.org/ja/docs/Web/HTML/Reference/Attributes/accept) を参照してください |
| multiple | 任意 | 真偽値 | 1つのフィールドで複数のファイルを送信したい場合は true を設定してください |
| max_size | 任意 | 文字列 | 添付ファイルのサイズ制限。KB, MB, GBのいずれかを指定してください |
| max_file_count | 任意 | 数値 | アップロード可能なファイル数の上限。指定しなかった場合、上限は以下の通りになります。<br>multiple:true の場合：100<br>multiple:false の場合：1 |

### セレクトボックス

#### 記述例

```json
"Request-key": {
    "type": "select",
    "title": "ラベルに表示されるタイトル",
    "desc": "フィールドの説明文",
    "required": false,
    "items": [
        { "title": "タイトル1", "value": "value1" },
        { "title": "タイトル2", "value": "value2" }
    ],
    "default_value": "value2"
}
```

#### パラメータ一覧

| パラメータ | 要否 | 型 | 備考 |
| --- | --- | --- | --- |
| title | 必須 | 文字列 | |
| desc | 任意 | 文字列 | |
| required | 任意 | 真偽値 | 指定しなかった場合、任意のフィールドとして扱われます |
| items | 必須 | 配列 | `{ "title": "", "value": "" }` 形式 |
| default_value | 任意 | 文字列 / 数値 | |

### チェックボックス

#### 記述例

```json
"Request-key": {
    "type": "checkbox",
    "title": "ラベルに表示されるタイトル",
    "desc": "フィールドの説明文",
    "required": false,
    "items": [
        { "title": "タイトル1", "value": "value1" },
        { "title": "タイトル2", "value": "value2" }
    ],
    "default_value": "value2"
}
```

#### パラメータ一覧

| パラメータ | 要否 | 型 | 備考 |
| --- | --- | --- | --- |
| title | 必須 | 文字列 | |
| desc | 任意 | 文字列 | |
| required | 任意 | 真偽値 | 指定しなかった場合、任意のフィールドとして扱われます |
| items | 必須 | 配列 | `{ "title": "", "value": "" }` 形式 |
| default_value | 任意 | 文字列 / 数値 | デフォルトでチェックされるのは現状1つまでで、将来的に複数の値をデフォルトでチェック可能にします |

### ラジオボタン

#### 記述例

```json
"Request-key": {
    "type": "radio",
    "title": "ラベルに表示されるタイトル",
    "desc": "フィールドの説明文",
    "required": false,
    "items": [
        { "title": "タイトル1", "value": "value1" },
        { "title": "タイトル2", "value": "value2" }
    ],
    "default_value": "value2"
}
```

#### パラメータ一覧

| パラメータ | 要否 | 型 | 備考 |
| --- | --- | --- | --- |
| title | 必須 | 文字列 | |
| desc | 任意 | 文字列 | |
| required | 任意 | 真偽値 | 指定しなかった場合、任意のフィールドとして扱われます |
| items | 必須 | 配列 | `{ "title": "", "value": "" }` 形式 |
| default_value | 任意 | 文字列 / 数値 | |

### hidden

見た目上には表示されないコンポーネントです。
内部的に送っておく必要のあるパラメータがある際に利用してください。

#### 記述例

```json
"Request-key": {
    "type": "hidden",
    "default_value": "value"
}
```

#### パラメータ一覧

| パラメータ | 要否 | 型 | 備考 |
| --- | --- | --- | --- |
| default_value | 必須 | 文字列 / 数値 | |

## 会話履歴(疑似チャット)

会話履歴は、API 定義の JSON に `conversation_history` というキーを追加することで利用できます。※ `conversation_history` 自体は UI には表示されません。

title や説明の入力は不要ですが、分かりやすくするために記載することを推奨します。このキーを追加すると、実行結果および履歴に「会話を続ける」ボタンが表示され、過去の情報を保持したままやり取りできるようになります。

過去の情報をどのように保持するかは AI アプリ側の実装にも依存するため、保持方法については源内の Web インターフェースでも複数の方法を用意しています。

```json
{
    "question": {
        ...
    },
    "conversation_history": {
        "title": "会話履歴",
        "desc": "過去の会話履歴を入力することで、その内容を参照した回答を生成できます",
        "type": "textarea"
    }
}
```

## サンプル

```json
{
  "question": {
    "title": "入力",
    "desc": "質問したい内容を入力してください。",
    "type": "text",
    "required": true,
    "default_value": "デフォルト値"
  },
  "content": {
    "title": "コンテンツ",
    "desc": "マークダウンでコンテンツを入力してください。",
    "type": "textarea"
  },
  "step": {
    "title": "number inputの例",
    "type": "number",
    "required": true,
    "min": 10,
    "max": 1000,
    "default_value": 20
  },
  "file": {
    "title": "添付ファイル",
    "type": "file",
    "accept": "image/*"
  },
  "prefecture": {
    "title": "都道府県",
    "type": "select",
    "items": [
      { "title": "東京都", "value": "13" },
      { "title": "神奈川県", "value": "14" }
    ]
  },
  "fruits": {
    "title": "フルーツ",
    "type": "checkbox",
    "items": [
      { "title": "りんご", "value": "apple" },
      { "title": "ばなな", "value": "banana" },
      { "title": "ぶどう", "value": "grape" }
    ]
  },
  "gender": {
    "title": "性別",
    "type": "radio",
    "items": [
      { "title": "男性", "value": "1" },
      { "title": "女性", "value": "2" }
    ]
  }
}
```

## 送出されるリクエスト

上記のサンプルを定義すると、源内 Web は AI アプリに対して以下のようにリクエストを送出します。
`inputs` 配下の値を取得して処理するように API を実装してください。

```json
{
  "inputs": {
    "question": "デフォルト値とは何ですか?",
    "content": "コンテンツコンテンツ\nコンテンツ",
    "step": 35,
    "files": [
      {
        "key": "key名",
        "files": [
          {
            "filename": "ファイル名",
            "content": "base64データ"
          },
          {
            "filename": "ファイル名",
            "content": "base64データ"
          }
        ]
      },
      {
        "key": "key名",
        "files": [
          {
            "filename": "ファイル名",
            "content": "base64データ"
          },
          {
            "filename": "ファイル名",
            "content": "base64データ"
          }
        ]
      }
    ],
    "prefecture": 13,
    "fruits": "apple,banana",
    "gender": 1
  }
}
```

### 注意点

- 数値は `""` で囲んだとしても、文字列ではなく数値として送られます。
- true / false は `""` で囲んだとしても、真偽値(true/false)として送られます。
- チェックボックスで複数選択した場合、`"a,b,c"` のようにカンマ区切りの文字列として送られます。
  - チェックボックスで単数選択した場合は, `"a"` のようにカンマなしの文字列として送られます。
- ファイルは Base64 エンコードされたコンテンツとして送信されます。
  - ファイルサイズが `max_size` 未満であっても、Base64 変換後の値でバリデーションされるため注意が必要です。

## レスポンス仕様

### 同期処理の場合

源内 Web インターフェースは、行政実務用 AI アプリへのリクエストに対するレスポンスとして、以下の形式を期待します。
`outputs` の値であるテキストは、源内 Web インターフェースのフロントエンドで処理されます。
テキストデータには Markdown 記法を含めることができます。

```json
{
  "outputs": "xxxxxxxxxxxxxxxxxx"
}
```

### 非同期処理の場合

#### 初期リクエスト例1: テキストのみ

```bash
# デプロイ時の出力に置き換えてください
URL="YOUR_INITIAL_REQUEST_URL" # /requests で終わるURL
API_KEY="YOUR_API_KEY"

# 送信するデータ。必ず "inputs" キーでラップすること。
# この形式は後述のカスタマイズポイントで定義します。
DATA='''{
  "inputs": {
    "question": "日本の歴史について、500文字程度で要約してください。",
    "max_length": 512
  }
}'''

curl -v -X POST \
     -H "Content-Type: application/json" \
     -H "x-api-key: ${API_KEY}" \
     -d "${DATA}" \
     "${URL}"
```

#### 初期リクエスト例2: ファイルを含む場合

ファイルは `inputs.files` に `{"任意のキー": {"contents": "...", "filename": "..."}}` の形式で含めます。`contents` はBase64エンコードされた文字列です。

```bash
# デプロイ時の出力に置き換えてください
URL="YOUR_INITIAL_REQUEST_URL"
API_KEY="YOUR_API_KEY"

# Base64エンコードされたファイルコンテンツ (例: "hello world"というテキスト)
FILE_CONTENTS=$(echo -n "hello world" | base64)

# 送信するデータ
DATA='''{
  "inputs": {
    "question": "このファイルの内容を要約してください。",
    "files": [
      { "key": "source_document",
        "contents": "'${FILE_CONTENTS}'",
        "filename": "input.txt"
      }
    ]
  }
}'''

curl -v -X POST \
     -H "Content-Type: application/json" \
     -H "x-api-key: ${API_KEY}" \
     -d "${DATA}" \
     "${URL}"
```

#### 初期レスポンス (202 Accepted)

リクエストが正常に受け付けられると、以下のレスポンスが返ります。

```json
{
  "outputs": "リクエストを受け付けました",
  "request_id": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
  "status": "PENDING",
  "status_url": "/status/a1b2c3d4-e5f6-7890-1234-567890abcdef"
}
```

#### ステータス確認 (ポーリング)

上記で受け取った `request_id` を使って、処理のステータスを問い合わせます。

```bash
# デプロイ時の出力に置き換えてください
URL="YOUR_STATUS_CHECK_URL_BASE" # /status/ で終わるURL
API_KEY="YOUR_API_KEY"
REQUEST_ID="a1b2c3d4-e5f6-7890-1234-567890abcdef"

STATUS_URL="${URL}${REQUEST_ID}"

curl -X GET \
     -H "Content-Type: application/json" \
     -H "x-api-key: ${API_KEY}" \
     "${STATUS_URL}"
```

#### ステータスレスポンス (処理中)

`status` は `PENDING` または `IN_PROGRESS` となり、`progress` フィールドで進捗状況を確認できます。

```json
{
  "created_at": "2025-08-06T10:00:00.123Z",
  "progress": "処理中... ステップ 3/5",
  "request_id": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
  "status": "IN_PROGRESS",
  "updated_at": "2025-08-06T10:02:30.456Z"
}
```

#### ステータスレスポンス (処理完了時)

`status` が `COMPLETED` になると、`outputs` (テキスト形式の出力) と `artifacts` (ファイル形式の出力) が含まれます。`artifacts` 内のファイルコンテンツはBase64エンコードされています。

```json
{
  "artifacts": [
    {
      "contents": "JVBERi0xLjAKMSAwIG9iago8PC9UeXBlL0NhdGFsb2cvUGFnZXMgMiAwIFI+...",
      "display_name": "dummy-report.pdf"
    }
  ],
  "created_at": "2025-08-06T10:00:00.123Z",
  "outputs": "This is a dummy output for question: '日本の歴史について、500文字程度で要約してください。'",
  "progress": "処理が完了しました。結果を保存しています...",
  "request_id": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
  "status": "COMPLETED",
  "updated_at": "2025-08-06T10:05:00.789Z"
}
```

#### ステータスレスポンス (エラー発生時)

`status` が `ERROR` になり、`error` フィールドにエラーの詳細が含まれます。

```json
{
  "created_at": "2025-08-06T10:00:00.123Z",
  "error": {
    "details": "Required resource not found.",
    "message": "An error occurred during processing."
  },
  "request_id": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
  "status": "ERROR",
  "updated_at": "2025-08-06T10:03:00.500Z"
}
```
