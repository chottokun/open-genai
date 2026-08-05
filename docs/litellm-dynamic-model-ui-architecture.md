# LiteLLM Proxy モデル情報動的取得・UIカテゴリ分離・動的パラメータ描画 アーキテクチャ設計仕様書

本ドキュメントは、Open GENAI において LiteLLM Proxy からモデル情報（メタデータを含む）を動的に取得し、Web UI 側でカテゴリ（チャット/画像生成/ダイアグラム/翻訳/文字起こし等）の分離や各モデル固有の追加パラメータ入力欄を動的に判定・描画するための包括的なシステムアーキテクチャ設計仕様書である。

---

## 1. 全体データフローとアーキテクチャ概要

システム全体のデータフローは以下の通りである。

```
┌─────────────────────┐
│    LiteLLM Proxy    │ (GET /v1/model/info)
│   (config.yaml)     │ ── モデル一覧 + model_info (mode, capabilities, supported_sizes 等)
└──────────┬──────────┘
           │
           ▼ (HTTPS / HTTP Internal)
┌─────────────────────────┐
│     Open GENAI          │ (GET /api/v1/models)
│     Backend API         │ ── ユーザー認可(JWT)・所属チームのモデル利用ポリシー(Policy.py)適用
│      (FastAPI)          │    サニタイズ・共通フォーマットへの構造変換
└──────────┬──────────┘
           │
           ▼ (HTTPS / JSON API)
┌─────────────────────────┐
│     Web Client UI       │ ── カテゴリ（Chat, ImageGen, Transcribe 等）ごとのフィルタリング
│     (React / TS)        │    動的な入力フォーム/パラメータコントロールパネルの判定・描画
│                         │    実行時、`extra_body` フィールドへパラメータを動的に埋め込み送信
└─────────────────────────┘
```

### アーキテクチャの主要メリット
1. **動的な運用の実現**: 新しい画像生成モデルやLLMを追加する際、LiteLLM Proxy側の `config.yaml` を変更するだけで、フロントエンド・バックエンドのソースコードを変更することなく、自動的にUI側の選択肢やフォーム項目が切り替わる。
2. **完全なOpenAI互換の維持**: プロバイダ独自のパラメータは `extra_body` に格納して送信するため、バックエンドの伝送レイヤーやインターフェースを破壊せず、各プロバイダ固有の拡張パラメータ（例：Recraft v3の `style_id`）に対応可能。
3. **セキュリティとアクセス制御の一元化**: ユーザーが所属するチームの「モデル利用ポリシー」をバックエンドで評価し、認可されたモデルのみをサニタイズして返却するため、UI側で個別の権限ロジックを実装する必要がない。

---

## 2. LiteLLM Proxy 側設定仕様 (`litellm_config.yaml`)

LiteLLM Proxy では、各モデル定義の `model_info` フィールド内にUI描画用のメタデータを記述する。

### 2.1 スキーマ定義
`model_info` に設定可能なフィールドとその意味：

*   `mode` (必須): `chat` | `image_generation` | `audio_transcription` | `diagram_generation` | `translation`
*   `display_name` (任意): UI上でユーザーに表示する人間が読めるモデル名。
*   `capabilities` (任意): モデルがサポートする機能（例：`["vision", "streaming", "reasoning", "document_input"]`）。
*   `supported_sizes` (任意・画像モデル専用): サポートされている解像度・アスペクト比のリスト（例：`["1024x1024", "16:9", "1792x1024"]`）。
*   `supported_qualities` (任意・画像モデル専用): 画質設定（例：`["standard", "hd"]`）。
*   `supported_styles` (任意・画像モデル専用): スタイルプリセット（例：`["vivid", "natural"]`）。
*   `extra_fields` (任意): UI側で動的に入力フォーム（ドロップダウンやテキストボックス）を描画するための宣言的定義。

### 2.2 具体的な記述例 (`litellm_config.yaml`)

```yaml
model_list:
  # テキストモデル (GPT-4o)
  - model_name: gpt-4o
    litellm_params:
      model: azure/gpt-4o-eastus
      api_key: os.environ/AZURE_API_KEY
    model_info:
      mode: chat
      display_name: "GPT-4o (High Performance)"
      capabilities: ["vision", "streaming", "document_input"]

  # 推論に特化したテキストモデル (DeepSeek R1)
  - model_name: deepseek-r1
    litellm_params:
      model: deepseek/deepseek-reasoner
      api_key: os.environ/DEEPSEEK_API_KEY
    model_info:
      mode: chat
      display_name: "DeepSeek R1 (Reasoning)"
      capabilities: ["streaming", "reasoning"]

  # 標準画像生成モデル (DALL-E 3)
  - model_name: dall-e-3
    litellm_params:
      model: openai/dall-e-3
      api_key: os.environ/OPENAI_API_KEY
    model_info:
      mode: image_generation
      display_name: "DALL-E 3 (OpenAI)"
      supported_sizes: ["1024x1024", "1792x1024", "1024x1792"]
      supported_qualities: ["standard", "hd"]
      supported_styles: ["vivid", "natural"]

  # ベクター画像・デザインに特化した独自パラメータを持つモデル (Recraft v3)
  - model_name: recraft-v3
    litellm_params:
      model: recraft/recraftv3
      api_key: os.environ/RECRAFT_API_KEY
    model_info:
      mode: image_generation
      display_name: "Recraft v3 (Vector & Design)"
      supported_sizes: ["1024x1024", "1820x1024", "1024x1820"]
      extra_fields:
        - key: "style_id"
          label: "アートスタイル"
          type: "select"
          default_value: "vector_art"
          options:
            - { value: "realistic_image", label: "リアル写真" }
            - { value: "digital_illustration", label: "デジタルイラスト" }
            - { value: "vector_art", label: "ベクターアート" }
        - key: "substyle_id"
          label: "詳細スタイル"
          type: "select"
          default_value: "linocut"
          options:
            - { value: "linocut", label: "リノカット版画" }
            - { value: "flat_art", label: "フラットアート" }
        - key: "negative_prompt"
          label: "除外したい要素"
          type: "text"
          default_value: ""

  # 音声文字起こしモデル (Whisper Large)
  - model_name: whisper-large-v3
    litellm_params:
      model: openai/whisper-large-v3
      api_key: os.environ/OPENAI_API_KEY
    model_info:
      mode: audio_transcription
      display_name: "Whisper Large v3"
      extra_fields:
        - key: "language"
          label: "入力音声の言語"
          type: "select"
          default_value: "auto"
          options:
            - { value: "auto", label: "自動検知" }
            - { value: "ja", label: "日本語" }
            - { value: "en", label: "英語" }
```

---

## 3. バックエンド API 設計仕様 (FastAPI / `backend`)

FastAPIバックエンドは、`GET /api/v1/models` エンドポイントを公開し、認証情報 (JWT) に基づいてユーザーが所属するチームの「モデル利用ポリシー」を検証した上で、許可されたモデル一覧のみをサニタイズして返却する。

### 3.1 エンドポイント定義

*   **URL**: `/api/v1/models`
*   **Method**: `GET`
*   **Headers**: `Authorization: Bearer <JWT_TOKEN>`
*   **Response (JSON)**:

```json
{
  "models": [
    {
      "id": "gpt-4o",
      "name": "GPT-4o (High Performance)",
      "type": "chat",
      "capabilities": ["vision", "streaming", "document_input"],
      "supported_sizes": [],
      "supported_qualities": [],
      "supported_styles": [],
      "extra_fields": []
    },
    {
      "id": "recraft-v3",
      "name": "Recraft v3 (Vector & Design)",
      "type": "image_generation",
      "capabilities": [],
      "supported_sizes": ["1024x1024", "1820x1024", "1024x1820"],
      "supported_qualities": [],
      "supported_styles": [],
      "extra_fields": [
        {
          "key": "style_id",
          "label": "アートスタイル",
          "type": "select",
          "default_value": "vector_art",
          "options": [
            { "value": "realistic_image", "label": "リアル写真" },
            { "value": "digital_illustration", "label": "デジタルイラスト" },
            { "value": "vector_art", "label": "ベクターアート" }
          ]
        }
      ]
    }
  ]
}
```

### 3.2 Python 実装詳細 (FastAPIコントローラー)

```python
from fastapi import APIRouter, Depends, HTTPException, Request
import httpx
import os
from app.auth import verify_token
from app.policy import allowed_models, _user_id, _user_scope_ids, _is_system_admin

router = APIRouter()

LITELLM_PROXY_URL = os.getenv("LITELLM_PROXY_URL", "http://litellm-proxy:4000")
LITELLM_MASTER_KEY = os.getenv("LITELLM_MASTER_KEY", "sk-master-key")

@router.get("/api/v1/models")
async def get_available_models(request: Request):
    """
    LiteLLM Proxy から全モデル情報を取得し、
    ユーザーの所属チーム別「モデル利用ポリシー」に基づいてフィルタリング・整形して返却する。
    """
    # 1. ユーザー認証の評価
    authz = request.headers.get("authorization", "")
    if not authz.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Unauthorized")
    try:
        claims = verify_token(authz[7:])
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")

    # 2. ユーザー別モデル制限ポリシー of 判定
    user_id = _user_id(claims)
    scopes = _user_scope_ids(claims)
    is_admin = _is_system_admin(claims)
    allowed_set = allowed_models(scopes, is_admin) # None は無制限

    # 3. LiteLLM Proxy /v1/model/info からのデータ取得
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(
                f"{LITELLM_PROXY_URL}/v1/model/info",
                headers={"Authorization": f"Bearer {LITELLM_MASTER_KEY}"},
                timeout=5.0
            )
            response.raise_for_status()
            raw_data = response.json()
        except Exception as e:
            # LiteLLM Proxy 接続エラー時は、フォールバックとして空配列を返すか、エラー返却
            raise HTTPException(status_code=502, detail=f"LLM Proxy Connection Error: {str(e)}")

    # 4. フィルタリングとサニタイズ処理
    formatted_models = []
    for item in raw_data.get("data", []):
        model_name = item.get("model_name")

        # ポリシー制限に適合しているか確認
        if allowed_set is not None and model_name not in allowed_set:
            continue

        model_info = item.get("model_info", {})

        # UIが解釈しやすい共通フォーマットに整形
        formatted_models.append({
          "id": model_name,
          "name": model_info.get("display_name", model_name),
          "type": model_info.get("mode", "chat"),
          "capabilities": model_info.get("capabilities", []),
          "supported_sizes": model_info.get("supported_sizes", []),
          "supported_qualities": model_info.get("supported_qualities", []),
          "supported_styles": model_info.get("supported_styles", []),
          "extra_fields": model_info.get("extra_fields", [])
        })

    return {"models": formatted_models}
```

---

## 4. フロントエンド UI 判定・動的描画設計 (TypeScript / React)

React フロントエンドは、バックエンドの単一のエンドポイント（`/api/v1/models`）からデータをフェッチし、各機能コンポーネント（チャット、画像生成等）で表示すべきモデルを絞り込み、固有パラメータを動的にレンダリングする。

### 4.1 型定義と API クライアント (TypeScript)

```typescript
export interface ModelOption {
  value: string;
  label: string;
}

export interface ModelField {
  key: string;
  label: string;
  type: 'select' | 'text' | 'number' | 'boolean';
  default_value?: any;
  options?: ModelOption[];
}

export interface DynamicModel {
  id: string;
  name: string;
  type: 'chat' | 'image_generation' | 'audio_transcription' | 'diagram_generation' | 'translation';
  capabilities: string[];
  supported_sizes: string[];
  supported_qualities: string[];
  supported_styles: string[];
  extra_fields: ModelField[];
}

// React Context もしくは Zustand ストア等での保持を想定
export interface ModelState {
  models: DynamicModel[];
  isLoading: boolean;
  error: string | null;
}
```

---

## 5. UI別 網羅的画面レイアウト・実装戦略

Open GENAI に存在する主要な画面（UI）ごとに、どのようにモデルを分離し、パラメータを反映させるかを定義する。

### 5.1 チャット画面 (Chat UI)
チャット画面では、`type === 'chat'` に該当するモデルのみを抽出し、セレクタに表示する。

#### レンダリング仕様
*   **モデル選択**: `type === 'chat'` のみ。
*   **マルチモーダル判定（画像添付）**: 選択中モデル의 `capabilities` に `vision` が含まれる場合のみ、チャット入力欄の画像添付アイコン（クリップ）を表示・有効化。
*   **ドキュメント添付**: 選択中モデルの `capabilities` に `document_input` が含まれる場合のみ表示。
*   **ストリーミング可否**: `capabilities` に `streaming` が含まれていればストリームAPI（`/predict/stream`）を呼び出し、含まれなければ通常一括API（`/predict`）を呼び出す。

#### チャット用動的フィルタリング例
```typescript
const chatModels = useMemo(() => {
  return allModels.filter(m => m.type === 'chat');
}, [allModels]);
```

---

### 5.2 画像生成画面 (Image Generation UI)
画像生成画面は、プロバイダ独自のパラメータが最も多様化する画面である。

#### レンダリング仕様
*   **モデル選択**: `type === 'image_generation'` のみ。
*   **画像アスペクト比 / 解像度**:
    *   選択中のモデルに `supported_sizes` が定義されている場合は、そのアスペクト比のリスト（例：`["1024x1024", "16:9"]`）をサイズドロップダウンに描画。
    *   空の場合は、標準サイズ（`["512x512", "1024x1024"]`）を代替描画する。
*   **画質 (Quality)・スタイル (Style)**:
    *   選択中モデルに `supported_qualities` または `supported_styles` がある場合のみ、それぞれのコントロールプルダウンを表示する。
*   **動的追加パラメータ (`extra_fields`) のレンダリング**:
    *   `currentModel.extra_fields` をループ処理し、型（`select` / `text` 等）に応じてReactのフォームコンポーネントを動的に並べる。
    *   ユーザーの入力値は一元化された辞書（`extraParams`）に保存する。

#### 画像生成コントロールパネルの実装コード例
```tsx
import React, { useState, useMemo } from 'react';

const ImageGenControls: React.FC<{ models: DynamicModel[] }> = ({ models }) => {
  const imageModels = useMemo(() => models.filter(m => m.type === 'image_generation'), [models]);
  const [selectedId, setSelectedId] = useState<string>(imageModels[0]?.id || '');
  const [size, setSize] = useState<string>('');
  const [dynamicInputs, setDynamicInputs] = useState<Record<string, any>>({});

  const currentModel = useMemo(() => imageModels.find(m => m.id === selectedId), [selectedId, imageModels]);

  const handleFieldChange = (key: string, value: any) => {
    setDynamicInputs(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="space-y-4 p-4 border rounded bg-gray-50">
      <div>
        <label className="block text-sm font-bold mb-1">モデル選択</label>
        <select value={selectedId} onChange={e => {
          setSelectedId(e.target.value);
          setDynamicInputs({}); // モデル変更時に動的パラメータ初期化
        }} className="w-full p-2 border rounded">
          {imageModels.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
      </div>

      {currentModel && (
        <>
          {/* 解像度リストの動的表示 */}
          {currentModel.supported_sizes.length > 0 && (
            <div>
              <label className="block text-sm font-bold mb-1">解像度 / サイズ</label>
              <select value={size} onChange={e => setSize(e.target.value)} className="w-full p-2 border rounded">
                {currentModel.supported_sizes.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          )}

          {/* 拡張パラメータ (extra_fields) の動的フォーム描画 */}
          {currentModel.extra_fields.map(field => (
            <div key={field.key} className="space-y-1">
              <label className="block text-sm font-semibold">{field.label}</label>
              {field.type === 'select' ? (
                <select
                  value={dynamicInputs[field.key] ?? field.default_value ?? ''}
                  onChange={e => handleFieldChange(field.key, e.target.value)}
                  className="w-full p-2 border rounded"
                >
                  {field.options?.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={dynamicInputs[field.key] ?? field.default_value ?? ''}
                  onChange={e => handleFieldChange(field.key, e.target.value)}
                  className="w-full p-2 border rounded"
                />
              )}
            </div>
          ))}
        </>
      )}
    </div>
  );
};
```

---

### 5.3 ダイアグラム・UML生成画面 (Diagram / UML UI)
Mermaid.js等を駆使してダイアグラムを生成する画面では、構造化データ・テキストの出力能力の高いモデルに限定する。

#### レンダリング仕様
*   **モデル選択**: `type === 'diagram_generation'` もしくは `type === 'chat'` の能力の高いモデルをマッピングする。
*   **出力検証機能**: 選択されたモデルに対して、Mermaid記法等の出力をより精密にするためのパラメータ（例：`temperature` や `top_p` の微調整用追加フィールド）を `extra_fields` を通して描画。

---

### 5.4 翻訳画面 (Translation UI)
異なる言語間で正確なマッピングを行うための翻訳画面。

#### レンダリング仕様
*   **モデル選択**: `type === 'translation'` または `type === 'chat'`。
*   **言語指定パラメータの動的解決**: LiteLLM Proxy側の `extra_fields` 定義を通じて、翻訳元（Source Language）および翻訳先（Target Language）の選択リスト、あるいは丁寧さ（Politeness - `casual`, `formal`）設定を動的に描画。

---

### 5.5 文字起こし画面 (Transcription UI)
音声ファイルの書き起こし処理。

#### レンダリング仕様
*   **モデル選択**: `type === 'audio_transcription'`。
*   **パラメータ連携**:
    *   自動言語識別を有効にするか、または明示的な言語指定を行うための動的セレクタ（`language`）を描画。
    *   発話開始時間のタイムスタンプ出力有無フラグ（`timestamp_granularities`）等の動的表示。

---

## 6. UI と API の密結合分析（UI Coupling and State Coupling Analysis）

既存の `genai-web` コードベースと新設する動的APIとの結合における、状態管理・ライフサイクル・フォーム検証の密結合分析、およびそのリファクタリング戦略を示す。

### 6.1 状態管理（Zustand & LocalStorage）との結合
現在、チャットおよび画像生成のモデル選択状態は、それぞれ別々のストアとフックに保存されている。

1.  **チャット側 (`useSelectedModel` フック)**
    *   **現状**: `modelId_v20260218` というキー名で `localStorage` に選択モデルを永続化。初期値やフォールバック時に `MODELS.modelIds[0]` を参照している（これは環境変数 `VITE_APP_MODEL_IDS` からのハードコード値）。
    *   **影響と対策**: APIフェッチ前にローカルストレージから読み込まれた古い `modelId` が、現在のチームポリシーや最新のLiteLLM Proxy定義に存在しない可能性がある。そのため、動的モデル一覧（`models`）がAPIからロードされたタイミングで、**有効値（許可されたモデル）に含まれているかを検証するバリデーション層（ガードレール）の追加**が必要となる。
2.  **画像生成側 (`useGenerateImageStore` ストア)**
    *   **現状**: `imageGenModelId` を文字列として保持。`setImageGenModelId` アクションをトリガーとして、`getResolutionPresets(imageGenModelId)` を経由したハードコード解像度プリセットの強制上書き、および `generationMode` の利用可能モード再計算が走る。
    *   **影響と対策**: 動的取得モデルにおいては、解像度やアスペクト比の一覧はローカルの `getResolutionPresets` からではなく、APIから受信した `supported_sizes` から動的にストアへマッピングさせるように設計を移行する必要がある。

---

### 6.2 画面レンダリング・コンポーネント結合
モデルセレクタおよび詳細設定フォームは、複数のコンポーネント間に跨る共有状態（Zustand）に依存している。

1.  **モデル選択dropdown (`CustomSelect`)**
    *   チャットの `ModelSelector.tsx` や画像生成の `ImageGeneratorForm.tsx` の内部に配置されている。
    *   これらは `allModels.map(...)` への切り替えにより、容易に動的化可能（既存コンポーネントのPropsインターフェースを破壊せず、データソースのみを差し替えるクリーンな結合が可能）。
2.  **代替モデル切り替え（エラーリトライ・ダイアログ）**
    *   `GenerateImagePage.tsx` に配置されている `CustomDialog`（エラーダイアログ）は、画像生成に失敗した際に「選択肢から失敗したモデルIDを排した代替モデルリスト」を表示する。
    *   この代替リスト生成部分（`imageGenModelIds.filter(...)`）も、動的に取得・ポリシーフィルタリングされた結果リストから直接抽出するように結合を整理する。

---

### 6.3 Zod / React Hook Form による検証との統合

複雑な画像生成パラメータやプロバイダ固有フィールド（`extra_fields`）を安全にフォーム検証するため、**Zodスキーマの動的生成パイプライン**を確立する。

#### 動的 Zod スキーマ解決フロー
```typescript
import { z } from 'zod';

/**
 * 選択中モデルの extra_fields 定義から Zod 検証スキーマを動的に組み立てる
 */
export const buildDynamicSchema = (extraFields: ModelField[]) => {
  const shape: Record<string, any> = {};

  for (const field of extraFields) {
    let validator;
    switch (field.type) {
      case 'number':
        validator = z.coerce.number();
        break;
      case 'boolean':
        validator = z.preprocess((val) => {
          if (typeof val === 'string') return val === 'true';
          return Boolean(val);
        }, z.boolean());
        break;
      case 'select':
        if (field.options && field.options.length > 0) {
          const allowedValues = field.options.map(opt => opt.value) as [string, ...string[]];
          validator = z.enum(allowedValues);
        } else {
          validator = z.string();
        }
        break;
      case 'text':
      default:
        validator = z.string();
        break;
    }

    // 全フィールドを任意（Optional）として扱い、未入力時はデフォルト値をフォールバック
    shape[field.key] = validator.optional();
  }

  return z.object(shape);
};
```

*   ** React Hook Form とのバインド**:
    *   モデル変更イベントを感知したタイミングで `buildDynamicSchema(currentModel.extra_fields)` を実行し、動的スキーマを再生成。
    *   それを React Hook Form の `resolver: zodResolver(dynamicSchema)` へ再注入することで、クライアントサイドでの厳格なバリデーションと動的パラメータ入力を安全に調停・密結合させる。

---

## 7. API 送信時の `extra_body` パラメータ透過送信仕様

UI側で入力された動的パラメータは、API要求発行時に `extra_body` パラメータに梱包して送信する。

### 7.1 リクエストペイロードの例 (画像生成 `POST /image/generate`)
```json
{
  "model": "recraft-v3",
  "params": {
    "prompt": "A futuristic city in flat vector style",
    "size": "1024x1024",
    "extra_body": {
      "style_id": "vector_art",
      "substyle_id": "flat_art"
    }
  }
}
```

これにより、バックエンドは個別のパラメータ検証やモデル別の分岐処理ロジックを持つことなく、フロントエンドが動的に組み立てたパラメータ群をそのままLiteLLM Proxyへと透過的に中継・フォワーディングすることが可能となり、完全なプロバイダ非依存が保証される。

---

## 8. 設計のまとめと運用手順

### モデル新規追加時の運用フロー
1.  **LiteLLM Proxy の設定変更**: `/litellm_config.yaml` に新しいモデル（例：`recraft-v3`）を追加し、その `model_info` に `extra_fields` や `supported_sizes` を定義。
2.  **Proxy 再起動/リロード**: LiteLLM Proxyが新しい設定ファイルをロードする。
3.  **UI自動反映**: 次回Web clientがログイン・起動したタイミングで、バックエンド `/api/v1/models` を経由して新しいメタデータが伝送され、フォーム項目 and カテゴリ分類が即座に画面へ自動レンダリングされる。開発者の追加コード開発は一切不要である。
