# Open GENAI: Upstream v0.5.0 Sync assessment & Independent Feature Implementation Possibility Study

## 1. Executive Summary

As a local-first, highly optimized fork of the Japanese Digital Agency's "GENAI" project, Open GENAI must balance aligning with upstream improvements while maintaining its key design choices:
* Absolute offline capabilities (local-first design via Ollama, Stable Diffusion, and faster-whisper).
* Unification of all LLM and image inference strictly through the **LiteLLM Proxy Hub**.
* Rigid security boundaries (unauthenticated `GET` access strictly for static generations, with all `PUT`/`POST`/`DELETE` calls guarded by JWT authentication).

Upstream has recently progressed beyond version `v0.5.0`, implementing several major enhancements:
1. Dedicated admin/utility screens (Knowledge Management, Model Policy, NG Words, Audit Logs, Prompt Templates, and User CSV Management).
2. Large document Map-Reduce processing for inline chat attachments.
3. Enhanced error handling and visual truncation notifications for large inputs.
4. Minor but critical bug fixes (NFC Normalization of source file names, auto-detection of attachment encodings).

However, Upstream's implementation involves deleting critical local-first services (`local-sd-api`, `local-whisper-api`) and removing LiteLLM routing configurations (`litellm_config.yaml`). A full git merge with `upstream/main` is therefore impossible without breaking our core architecture.

This document presents a **Possibility Study** for implementing these features independently, optimized for our LiteLLM-routed, local-first architecture, without inheriting upstream's external-cloud-centric design choices.

---

## 2. Feature-by-Feature Independent Implementation Analysis

### 2.1 Large Chat Attachments Map-Reduce processing (大容量チャット添付のその場マップリデュース)

#### Upstream Design & Shortcomings
Upstream processes large chat attachments by chunking them, scheduling a summarizing/extraction pass, and reduction before injecting the result into the main prompt. This prevents context length exhaustion but relies on cloud-based LLM token limits and does not optimize for heavy context-limited local/offline inference (e.g., running on CPU or low-VRAM GPUs).

#### Our Independent local-first Design
We can implement an in-memory, local-first Map-Reduce processor inside `backend/app/doc_mapreduce.py` fully decoupled from upstream's orchestration.

```
+-------------------+
|  Large File Upload |  (e.g., > 60,000 characters)
+---------+---------+
          |
          v
+---------+---------+
| Sliding-Window    |  Divide text into 8,000-char overlapping chunks
| Chunking Engine   |  (overlapping by 500 chars to maintain context)
+---------+---------+
          |
          v
+---------+---------+
| Map Phase         |  Call local LiteLLM Proxy model concurrently
| (Batch Summary)   |  using asyncio.gather to extract relevance to user query
+---------+---------+
          |
          v
+---------+---------+
| Reduce Phase      |  Combine chunk summaries, check combined size against
| (Consolidation)   |  CHAT_DOC_INLINE_CHARS, and generate final prompt context
+-------------------+
```

##### Critical Performance Optimization (Batching & Concurrency)
Instead of linear sequential requests which would block the backend event loop and trigger client timeouts:
1. Utilize `asyncio.gather` with a concurrency semaphore (limit = 3) to execute Map requests concurrently against the LiteLLM Proxy.
2. If the combined size of summaries still exceeds `CHAT_DOC_INLINE_CHARS` (default: 60,000), perform a recursive reduction pass or fall back to high-relevance extractive summary.
3. Prepend a descriptive note (e.g., `[大容量文書: 自動要約圧縮して注入済]`) to the LLM query, keeping the original document context clean in the background store.

---

### 2.2 Dify exApp Error Classification and Visualization (Difyエラー分類と大容量処理の可視化)

#### Upstream Design & Shortcomings
Upstream catches Dify workflow exceptions and maps them to generic messages, or truncates files silently during ingestion.

#### Our Independent local-first Design
We must maintain absolute input and canvas mask state preservation when errors occur, avoiding silent failures.

##### Interceptor Specification
We implement an HTTP error status transformer inside `dify-app/app/main.py`:

```python
def classify_provider_error(status_code: int, response_text: str) -> dict[str, Any]:
    """Map downstream HTTP errors to specific user-actionable notifications."""
    text_lower = response_text.lower()
    if status_code == 429:
        return {
            "type": "RATE_LIMIT",
            "message": "リクエスト制限（Rate Limit）に達しました。しばらく待ってから再試行してください。"
        }
    elif status_code == 413 or "context_length_exceeded" in text_lower:
        return {
            "type": "CONTEXT_OVERFLOW",
            "message": "入力テキストの容量が大きすぎます。分割するか、短いテキストで試してください。"
        }
    elif 400 <= status_code < 500:
        return {
            "type": "BAD_REQUEST",
            "message": f"リクエストパラメータに不備があります。エラーコード: {status_code}"
        }
    else:
        return {
            "type": "SERVER_ERROR",
            "message": f"モデルサービス側でエラーが発生しました。接続状況を確認してください (HTTP {status_code})"
        }
```

##### Frontend Recovery Dialog Dynamic Integration
In `packages/web/src/features/generate-image/hooks/useGenerateImage.ts` and chat handlers:
* Do not auto-fallback between model groups, which violates our LiteLLM strict routing.
* If the classified error returns, trigger a user-interactive retry modal.
* The modal allows selecting alternative active models (e.g., `sd-local` vs `sd-cloud`) while preserving prompt parameters, seeds, and canvas masks intact.

---

### 2.3 Dedicated Admin and Utility Page Architecture (専用ページ群の独立設計)

To replace the heavy and layout-constrained generic schema-driven forms with beautiful, dedicated React-Router pages, we can design the routing and UI flow independently:

```
[React Frontend SPA Routes]
├── /knowledge (Shared/Team scopes selector, Tag Manager, File Upload)
└── /admin
    ├── /users (CSV import dry-run table, active users list)
    ├── /audit (Logs filtering, JST timestamping, export as JSONL)
    ├── /model-policy (Checkboxes for allowed models per team)
    └── /ngword (Edit forbidden words, regex validation, MyNumber check toggle)
```

#### Frontend Architecture Layers

1. **State-to-API Coupling (Zustand Stores):**
   Each dedicated page gets a custom Zustand store (e.g., `useNgwordStore`, `useKnowledgeStore`) managing dynamic page states (loading, pagination, active selection).
2. **Form Validation (React Hook Form & Zod):**
   Enforce input schemas client-side. For User CSV uploads:
   ```typescript
   const userCsvRowSchema = z.object({
     userId: z.string().min(1, "ユーザーIDは必須です"),
     username: z.string().min(1, "表示名は必須です"),
     email: z.string().email("無効なメールアドレス形式です"),
     role: z.enum(["admin", "user"]),
     password: z.string().min(8, "パスワードは8文字以上必要です").optional()
   });
   ```
   Dry-runs are processed in-memory, showing validation errors inside a structured table before committing changes.

#### Backend Security Boundaries
All admin page routes must be secured. In `backend/app/main.py`:
* Validate HS256 JWT tokens.
* Enforce `_is_system_admin` checks:
  ```python
  def _is_system_admin(payload: dict[str, Any] = Depends(get_current_jwt_payload)):
      roles = payload.get("roles", [])
      if "system-admin" not in roles:
          raise HTTPException(status_code=403, detail="管理者権限がありません")
  ```
* Direct communications to admin microservices (`modelpolicy-app`, `ngword-app`) using HMAC-signed internal request signatures to prevent SSRF or unauthorized direct calls.

---

## 3. Upstream Micro-fixes Integration Plan

While new features can be implemented independently using the specifications above, we should patch the critical bug fixes from upstream into our existing codebase immediately to ensure robustness.

### 3.1 ナレッジ source ファイル名を NFC に正規化する (`6781718`)
* **Problem:** Files uploaded from macOS are often encoded in NFD (Normalization Form Decomposition), while other clients upload in NFC. This causes RAG queries and tag-mappings to fail to match due to string mismatches.
* **Solution:** Create `rag-app/app/textnorm.py` to strip and normalize file names/URL strings to Unicode NFC.

```python
import unicodedata

def normalize_source(source: str | None) -> str:
    if source is None:
        return ""
    return unicodedata.normalize("NFC", str(source)).strip()
```

### 3.2 添付テキストの文字コードを自動判定する (`d150675`)
* **Problem:** Text files uploaded with different encodings (e.g., Shift-JIS or EUC-JP common in Japanese municipal systems) crash the document parser or get garbled when parsed strictly as UTF-8.
* **Solution:** Leverage `chardet` or `charset-normalizer` in `shared/docextract.py` to auto-detect text file encodings before decoding.

```python
import charset_normalizer

def decode_bytes(content: bytes) -> str:
    result = charset_normalizer.detect(content)
    encoding = result.get("encoding") or "utf-8"
    try:
        return content.decode(encoding)
    except Exception:
        return content.decode("utf-8", errors="ignore")
```

### 3.3 大容量チャット添付でチャンク爆発して無応答になるのを防ぐ (`a2a4fec`)
* **Problem:** Uploading massive files causes PyPDF or text extraction to create an excessive number of chunks, saturating SQLite memory or triggering endless loops in LLM context assembly.
* **Solution:** Clamp total tokens or characters at `MAX_CHAT_DOC_CHARS` (500,000 chars) and throw an informative, user-friendly exception instead of crashing or freezing.

---

## 4. Quality Assurance, Security Audit, and Verification Results

To guarantee absolute stability after any patch or independent implementation, the following QA practices must be followed.

### 4.1 Dependency Audit & Security Check
Regular execution of `scripts/audit-python-deps.sh` is mandatory.
* Confirm that heavy packages are not introduced into light microservices.
* Ensure `pypdf>=6.14.2` is pinned across all sub-services to guarantee protection against known CVEs.

### 4.2 Automated Testing Isolated Suites
Running backend Python tests using single commands must be avoided due to PYTHONPATH conflicts. Verify services in isolation:
* **Backend Suite:** `PYTHONPATH=backend pytest backend/tests`
* **RAG Suite:** `PYTHONPATH=rag-app pytest rag-app/tests`
* **Frontend Web Suite:** `npm run web:test` from inside the `genai-web` directory.

### 4.3 Static and Interactive UI Verification
Before finalizing any layout or route adjustments:
1. Execute `npm run web:dev` in a background screen.
2. Verify visual correctness (responsive sidebar alignment, no clipping on mobile menus, contrast compliance with digital design rules).
3. Test retry modals manually with mock failures (e.g. cutting connection to SD API) to verify prompt state-preservation.

---

## 5. Feasibility Assessment & Conclusion

Implementing upstream's v0.5.0 features independently is **highly feasible and highly recommended**.

| Feature | Merging Upstream directly | Independent local-first Design | Recommendation |
| --- | --- | --- | --- |
| **Model/SD Services** | Breaks local LiteLLM configurations & deletes services. | Completely preserves our standardized offline services and `litellm_config.yaml`. | **Keep Local/Prioritize LiteLLM** |
| **Map-Reduce Summary** | Complex, hardcoded to cloud limits. | Lightweight sliding-window optimized for local LLMs (Qwen/Llama). | **Independent Implementation** |
| **Dedicated Admin pages** | Massive routing and schema conflicts. | Clean React-Router routes with custom Zod & Zustand validations. | **Independent Implementation** |
| **Unicode NFC & Encoding Fixes** | Manual cherry-pick conflicts. | Apply direct code-level patches to `docextract.py` & `rag-app`. | **Patch Immediately** |

By adopting the Independent Implementation path, Open GENAI retains its absolute local-first integrity and security compliance, while actively integrating the power and convenience of upstream's admin pages and large document capabilities.
