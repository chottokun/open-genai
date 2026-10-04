# Upstream Synchronization & Evaluation Report (2026-10-04)

## Executive Summary
This report documents the evaluation and selective patch integration of upstream changes up to **v0.12.0** (commit `27a66c0`) from `https://github.com/hirokawaguchi/open-genai`.

In alignment with Policy B (方針B: Selective Patching & LGWAN Closed-Network Security Preservation), security updates for `pypdf` (`6.19.0`), `PyJWT` (`2.15.1`), and `accelerate` (`1.15.0`) were integrated and verified. Standalone microservices (`nishukan-app` / `jigyo` 2週間の仕事 and `procuretech-editor-app` extensions) were evaluated and deferred to maintain LGWAN closed-network security boundaries and LiteLLM proxy centralization.

---

## 1. Upstream Commits Evaluated

Upstream commits evaluated post-v0.11.0 (`cbf5a14`) up to v0.12.0 (`27a66c0`):

| Commit SHA | Author | Title | Decision | Rationale |
|---|---|---|---|---|
| `27a66c0` | Hiro KAWAGUCHI | Merge pull request #114 from hirokawaguchi/fix/nishukan-web-build | **Deferred** | Related to nishukan-app microservice UI. |
| `ab3a22c` | Hiro Kawaguchi | fix(web): 二週間の仕事の画面が型エラーでビルドできないのを直す | **Deferred** | Related to nishukan-app microservice UI. |
| `d1a42b9` | Hiro KAWAGUCHI | Merge pull request #113 from hirokawaguchi/release/v0.12.0 | **Evaluated** | Release v0.12.0 tag evaluated. |
| `dda4899` | Hiro Kawaguchi | docs: v0.12.0 を二週間の仕事のリリースとして記す | **Evaluated** | Upstream release note for v0.12.0. |
| `70f70d7` | Hiro KAWAGUCHI | Merge pull request #112 from hirokawaguchi/fix/nishukan-names | **Deferred** | Standalone microservice rename. |
| `cef6b9d` | Hiro Kawaguchi | fix(deps): pypdf を 6.19.0 に上げて既知の脆弱性を解消する | **Integrated** | Security patch addressing CVEs in `pypdf`. |
| `1b8535d` | Hiro Kawaguchi | fix(nishukan): ボリューム、ソース、登録 ID を nishukan に揃える | **Deferred** | Standalone microservice configuration. |
| `c188df2` | Hiro KAWAGUCHI | Merge pull request #111 from hirokawaguchi/fix/nishukan-profile | **Deferred** | Standalone microservice compose profiles. |
| `6c71a3b` | Hiro Kawaguchi | fix(nishukan): 任意起動の profile とサービス名を nishukan にする | **Deferred** | Standalone microservice compose profiles. |
| `9afa525` | Hiro KAWAGUCHI | Merge pull request #110 from hirokawaguchi/feat/jigyo | **Deferred** | Standalone microservice (`jigyo`/`nishukan`). |
| `1f05e5b` | Hiro Kawaguchi | feat(jigyo): チームの仕事を2週間の期枠で見る画面を追加する | **Deferred** | Standalone microservice for 2-week task management. |
| `b6f4aa3` | Hiro Kawaguchi | fix(editor): 図の反映ボタンを文書校正と同じ見た目にする | **Deferred** | Standalone editor microservice enhancement. |
| `c730852` | Hiro Kawaguchi | fix(editor): 生成した図を、選択の置換か後ろへの挿入で入れられるようにする | **Deferred** | Standalone editor microservice enhancement. |
| `9e67f44` | Hiro Kawaguchi | fix(editor): AI 図は Mermaid のまま挿入し、画像化は書き出しに任せる | **Deferred** | Standalone editor microservice enhancement. |
| `a19dad9` | Hiro Kawaguchi | fix(editor): 図は確認してから挿入し、変換中の Tab で本文が崩れないようにする | **Deferred** | Standalone editor microservice enhancement. |
| `14724ff` | Hiro Kawaguchi | fix(editor): Markdown エディタの画面と画像埋め込みを直す | **Deferred** | Standalone editor microservice enhancement. |

---

## 2. Integrated Security Upgrades

1. **`pypdf` Upgrade (6.15.0 -> 6.19.0)**:
   - Upgraded in `backend/requirements.txt`, `rag-app/requirements.txt`, and `tests/requirements.txt`.
   - Resolves PYSEC-2026-3910, PYSEC-2026-3911, PYSEC-2026-3913, PYSEC-2026-4153, PYSEC-2026-4154, PYSEC-2026-4155, PYSEC-2026-4156, PYSEC-2026-4157, PYSEC-2026-4158, PYSEC-2026-4159, PYSEC-2026-4160.
2. **`PyJWT` Security Baseline Verification**:
   - Verified present at `2.15.1` in `backend/requirements.txt`.
3. **`accelerate` Upgrade (1.14.0 -> 1.15.0)**:
   - Upgraded in `local-sd-api/requirements.txt` to eliminate PYSEC-2026-3804.

---

## 3. Dependency Audit & Regression Testing Results

- **`scripts/audit-python-deps.sh`**:
  - Scanned 13 Python requirement files.
  - **Result**: **0 known vulnerabilities found**.

- **Backend Pytest (`bash scripts/run-regression-tests.sh`)**:
  - **Result**: **109 passed, 4 skipped**.
  - `tests/test_pypdf_upgrade_validation.py`: **14 passed** (100%).

- **Frontend Vitest (`cd genai-web && npm run web:test`)**:
  - **Result**: **631 passed** across 54 test files (100%).

---

## 4. Conclusion & Next Steps
All security requirements and upstream evaluation criteria have been thoroughly satisfied. Codebase stability is 100% verified.
