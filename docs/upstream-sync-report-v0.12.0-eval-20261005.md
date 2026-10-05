# Upstream Sync Evaluation & Security Audit Report (v0.12.0)

**Date**: October 5, 2026
**Target Upstream Commit**: `27a66c0164c9a8eb9072de011fcc27bd7b5d994b` (Merge pull request #114 / Release v0.12.0)
**Evaluator**: Jules (AI Agent)

---

## 1. Executive Summary

An evaluation was performed on the official upstream repository (`https://github.com/hirokawaguchi/open-genai`) up to release **v0.12.0** (commit `27a66c0`).

In alignment with **Policy B (方針B: Selective cherry-picking and security patching)**:
1. **Security Patching**:
   - Upgraded `pypdf` from `6.15.0` to `6.19.0` across `backend/requirements.txt`, `rag-app/requirements.txt`, and `tests/requirements.txt`.
   - Upgraded `PyJWT` from `2.13.0` to `2.15.1` in `backend/requirements.txt` and `tests/requirements.txt`.
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

| Commit SHA | Feature / Description | Policy B Decision | Rationale |
|---|---|---|---|
| `cef6b9d` | `fix(deps): pypdf` upgrade to 6.19.0 | **Integrated** | Resolves security vulnerabilities (CVE-2026-4153, CVE-2026-4157, CVE-2026-4159, CVE-2026-4160). |
| `7c89abc` | `fix(deps): PyJWT` upgrade to 2.15.1 | **Integrated** | Resolves security vulnerabilities (PYSEC-2026-4140 to 4152). |
| `1f05e5b`, `1b8535d` | `feat(jigyo)/fix(nishukan)` 2週間の仕事 UI & storage | **Deferred** | Standalone microservice with separate DB/volumes. |
| `14724ff`, `a19dad9`, `b6f4aa3` | `feat(diagram-drawio)` AI Diagram Editor extensions | **Deferred** | Bypasses centralized LiteLLM proxy hub and introduces custom client-side hooks. |
| `cccf70f`, `4563c4a` | `feat(tenants)` Building isolation and notices | **Deferred** | Multi-tenant tenant ID routing interferes with local single-tenant LGWAN isolation. |

---

## 3. Security & Compliance Audit

### Dependency Vulnerability Scan Results (`scripts/audit-python-deps.sh`)

```
=== ./audit-app/requirements.txt === No known vulnerabilities found
=== ./backend/requirements.txt === No known vulnerabilities found
=== ./dify-app/requirements.txt === No known vulnerabilities found
=== ./knowledge-mcp/requirements.txt === No known vulnerabilities found
=== ./local-sd-api/requirements.txt === No known vulnerabilities found
=== ./local-whisper-api/requirements.txt === No known vulnerabilities found
=== ./modelpolicy-app/requirements.txt === No known vulnerabilities found
=== ./ngword-app/requirements.txt === No known vulnerabilities found
=== ./prompt-app/requirements.txt === No known vulnerabilities found
=== ./rag-app/requirements.txt === No known vulnerabilities found
=== ./tests/requirements.txt === No known vulnerabilities found
=== ./usermgmt-app/requirements.txt === No known vulnerabilities found
=== ./whisper-app/requirements.txt === No known vulnerabilities found

Scanned 13 requirement files: 0 known vulnerabilities found.
```

---

## 4. Verification & Quality Assurance

- **Backend Pytest**: `109 passed, 4 skipped` (4 skipped due to opt-in sidecar GPU hardware dependencies).
- **Frontend Vitest**: `631 passed` across 54 test files in `genai-web`.
- **Pre-commit Audit**: All dependency requirements files formatted and validated.
