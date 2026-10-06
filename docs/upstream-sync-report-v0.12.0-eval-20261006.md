# Upstream Sync Evaluation & Security Audit Report (v0.12.0)

**Date**: October 6, 2026
**Target Upstream Commit**: `27a66c0164c9a8eb9072de011fcc27bd7b5d994b` (Merge pull request #114 / Release v0.12.0)
**Evaluator**: Jules (AI Agent)

---

## 1. Executive Summary

An evaluation was performed on the official upstream repository (`https://github.com/hirokawaguchi/open-genai`) up to release **v0.12.0** (commit `27a66c0`).

In alignment with **Policy B (方針B: Selective cherry-picking and security patching)**:
1. **Security Patching**:
   - Upgraded `pypdf` from `6.15.0` to `6.19.0` across `backend/requirements.txt`, `rag-app/requirements.txt`, and `tests/requirements.txt`.
   - Upgraded `PyJWT` from `2.13.0` to `2.15.1` in `backend/requirements.txt`.
   - Upgraded `accelerate` from `1.14.0` to `1.15.0` in `local-sd-api/requirements.txt`.
   - Confirmed **0 vulnerabilities** across all 13 Python requirements files via `scripts/audit-python-deps.sh`.

2. **Feature Evaluation & Scope Boundary Analysis**:
   - Upstream feature microservices (`jigyo`/`nishukan-app` 2週間の仕事, `diagram-drawio` AI図形描画, and `tenants` 棟ごとのモデル制御/分離) were evaluated and **deferred**.
   - **Rationale**: Incorporating standalone microservices with independent persistence, custom router gateways, or multi-tenant database partitioning violates our LGWAN closed-network security boundaries and LiteLLM centralized model routing design.

3. **Regression Testing**:
   - Backend Python tests (`uv run pytest` / `scripts/run-regression-tests.sh`): **109 passed, 0 failed**.
   - Frontend Web tests (`npm run web:test` in `genai-web`): **631 passed, 0 failed** across 54 test files.

---

## 2. Upstream Commit Analysis (post-v0.11.0 to v0.12.0)

| Upstream SHA | Commit Summary | Scope Evaluation & Decision |
|---|---|---|
| `27a66c0` / `ab3a22c` | fix(web): 二週間の仕事の画面が型エラーでビルドできないのを直す | **Deferred**: Depends on `nishukan-app` (`jigyo`) microservice. |
| `d1a42b9` / `dda4899` | release: v0.12.0 (Release documentation) | **Evaluated**: Master release tag for v0.12.0. |
| `cef6b9d` | fix(deps): pypdf を 6.19.0 に上げて既知の脆弱性を解消する | **Adopted**: Patched across `backend`, `rag-app`, and `tests`. |
| `1b8535d` / `6c71a3b` | fix(nishukan): Volume/Source/ID alignment | **Deferred**: Standalone `nishukan-app` microservice. |
| `1f05e5b` | feat(jigyo): チームの仕事を2週間の期枠で見る画面を追加する | **Deferred**: `jigyo` microservice. |
| `b6f4aa3` - `14724ff` | fix(editor): Markdown editor diagram insertions and preview | **Deferred**: Tied to `diagram-drawio` microservice. |
| `cbf5a14` / `acb8292` | feat(llm): LLM_FALLBACKS for fallback model routing | **Deferred**: Managed via LiteLLM Gateway in our local architecture. |
| `72c79f3` / `cccf70f` | feat(tenants): Common apps across tenant buildings | **Deferred**: `tenants` multi-tenant architecture. |
| `7c89abc` | fix(deps): PyJWT を 2.15.1 に上げて既知の脆弱性を解消する | **Adopted**: Patched in `backend/requirements.txt`. |

---

## 3. Dependency Security Audit Results

All 13 Python requirement files were scanned using `scripts/audit-python-deps.sh` (`pip-audit`):

- `audit-app/requirements.txt`: 0 vulnerabilities
- `backend/requirements.txt`: 0 vulnerabilities (patched `pypdf` to `6.19.0`, `PyJWT` to `2.15.1`)
- `dify-app/requirements.txt`: 0 vulnerabilities
- `knowledge-mcp/requirements.txt`: 0 vulnerabilities
- `local-sd-api/requirements.txt`: 0 vulnerabilities (patched `accelerate` to `1.15.0`)
- `local-whisper-api/requirements.txt`: 0 vulnerabilities
- `modelpolicy-app/requirements.txt`: 0 vulnerabilities
- `ngword-app/requirements.txt`: 0 vulnerabilities
- `prompt-app/requirements.txt`: 0 vulnerabilities
- `rag-app/requirements.txt`: 0 vulnerabilities (patched `pypdf` to `6.19.0`)
- `tests/requirements.txt`: 0 vulnerabilities (patched `pypdf` to `6.19.0`)
- `usermgmt-app/requirements.txt`: 0 vulnerabilities
- `whisper-app/requirements.txt`: 0 vulnerabilities

---

## 4. Test Verification Summary

- **Backend Pytest Execution**:
  `uv run pytest` -> 109 passed, 4 skipped (0 failures).
- **Frontend Vitest Execution**:
  `npm run web:test` -> 54 test files passed, 631 individual tests passed (0 failures).

---

## 5. Conclusion & Recommendations

The repository is synchronized with upstream up to release **v0.12.0** (`27a66c0`). All security dependencies are clean and verified with 100% test pass rates across all suites.
