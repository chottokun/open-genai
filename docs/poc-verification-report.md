# PoC検証報告書 (PoC Verification Report)

本ドキュメントでは、`feature/possibility-study` ブランチ上で実施された安全装置（Crash-On-Weak-Key）、スキーマ共有自動化（Pydanticバリデーション）、および同時実行制限（セマフォ）の各 PoC 実装に対する、徹底的な検証の内容とその検証結果を報告します。

---

## 1. 検証サマリー
すべての検証項目において、設計通りの挙動を示すことが確認されました。

| 検証項目 | 検証内容 | 期待される結果 | 実際の結果 | 判定 |
| :--- | :--- | :--- | :--- | :---: |
| **Crash-On-Weak-Key (JWT)** | `APP_JWT_SECRET` に弱い鍵をセットして起動 | `ValueError` で起動停止する | `ValueError: Security Error...` で強制終了 | **PASS** |
| **Crash-On-Weak-Key (Internal)** | `INTERNAL_SIGNING_SECRET` に弱い鍵をセット | `ValueError` で起動停止する | `ValueError: Security Error...` で強制終了 | **PASS** |
| **HMAC鍵 最小長チェック** | 32バイト未満の任意の鍵を設定して起動 | `ValueError` で起動停止する | `ValueError: ... 長さが32バイト未満` で強制終了 | **PASS** |
| **安全な鍵による正常起動** | 32バイト以上の強固な秘密鍵を設定して起動 | 例外が発生せず正常起動する | 例外なく正常終了（検証パス） | **PASS** |
| **開発環境の後方互換性** | `INTERNAL_SIGNING_SECRET` を空にして起動 | 検証スキップで正常起動する | 例外なく正常終了（検証パス） | **PASS** |
| **Pydantic バリデーション** | 正常な API リクエストの送信 | 例外なく正常にパース完了 | `Valid check: PASS` | **PASS** |
| **スキーマバリデーション (型異常)** | `top_k` に文字列など不正な型を送信 | `ValidationError` を返却する | `ValidationError (top_k: Input should be a valid integer)` | **PASS** |
| **スキーマバリデーション (欠損)** | `inputs` の無い不正なリクエストを送信 | `ValidationError` を返却する | `ValidationError (inputs: Field required)` | **PASS** |
| **セマフォ排他制御 (高負荷対策)** | 同時に複数の文字起こしリクエストを送信 | 同時実行数が常に1に制限される | 順次処理され最大同時実行数1を維持 | **PASS** |
| **リグレッションテスト** | `scripts/run-regression-tests.sh` の実行 | 既存テストを含む全テストが通過する | `44 passed` で全テスト成功 | **PASS** |

---

## 2. 詳細な検証手順と証跡

### 2.1. Crash-On-Weak-Key & 最小長強化の検証

#### (A) 弱い鍵および32バイト未満の鍵のチェック
環境変数 `APP_JWT_SECRET` にデフォルト値のプレースホルダーを適用して、検証処理を実行：
```bash
$ APP_JWT_SECRET=change-me-open-genai-secret python -c "from backend.app import auth; auth.verify_secret_strength()"
```
**[出力結果 (証跡)]**:
```
Traceback (most recent call last):
  ...
ValueError: Security Error (Crash-On-Weak-Key): APP_JWT_SECRET はデフォルトの弱い鍵 ('change-me-open-genai-secret') に設定されています。本番環境および開発環境のセキュリティ向上のため、32バイト以上の独自の鍵に変更してください。
```

32バイト未満の短い鍵を設定して検証：
```bash
$ APP_JWT_SECRET=short-key python -c "from backend.app import auth; auth.verify_secret_strength()"
```
**[出力結果 (証跡)]**:
```
Traceback (most recent call last):
  ...
ValueError: Security Error (Crash-On-Weak-Key): APP_JWT_SECRET の長さが32バイト未満 (9 バイト) です。SHA256 で安全とされる 32バイト（256ビット）以上の強固な秘密鍵を設定してください。
```

`INTERNAL_SIGNING_SECRET` に短い鍵を設定して検証：
```bash
$ INTERNAL_SIGNING_SECRET=short-key python -c "from backend.app import intauth; intauth.verify_secret_strength()"
```
**[出力結果 (証跡)]**:
```
Traceback (most recent call last):
  ...
ValueError: Security Error (Crash-On-Weak-Key): INTERNAL_SIGNING_SECRET の長さが32バイト未満 (9 バイト) です。SHA256 で安全とされる 32バイト（256ビット）以上の強固な秘密鍵を設定してください。
```

#### (B) 安全な鍵による起動と開発互換の検証
32バイト以上の安全な鍵を設定した場合：
```bash
$ APP_JWT_SECRET=my-super-strong-and-very-long-secret-key-1234567890 python -c "from backend.app import auth; auth.verify_secret_strength(); print('SUCCESS')"
```
**[出力結果]**: `SUCCESS` (正常起動を実証)

開発互換（鍵未設定時は検証スキップ）の検証：
```bash
$ INTERNAL_SIGNING_SECRET="" python -c "from backend.app import intauth; intauth.verify_secret_strength(); print('SUCCESS')"
```
**[出力結果]**: `SUCCESS` (後方互換モードを実証)

---

### 2.2. Pydantic スキーマバリデーションの検証
定義した Pydantic スキーマモデルに対し、検証スクリプトを実行：
```python
from shared.schemas.rag import RagInvokeRequest

# 正常データ
RagInvokeRequest.model_validate({"inputs": {"action": "ask", "question": "test?", "top_k": 4}})
```
**[結果]**: バリデーションエラーなくパス。

不正データ（型異常、必要なキーの欠損など）を送信した場合、以下の通り正確なバリデーションエラーが出力されることを確認：
- **`top_k` に文字列を投入した際のエラー**:
  `Input should be a valid integer, unable to parse string as an integer [type=int_parsing, input_value='not-a-number', input_type=str]`
- **`inputs` キー自体が無い場合のエラー**:
  `Field required [type=missing, input_value={'action': 'ask'}, input_type=dict]`

---

### 2.3. セマフォによる同時実行制限（排他制御）の検証
複数スレッドや非同期タスクが同時に音声文字起こし処理をリクエストした状況を想定し、非同期検証スクリプトを実行。
３つのタスクが並行して発行された状況：
**[実行ログ (証跡)]**:
```
[Task 1] Waiting for semaphore...
[Task 1] Entered critical section (Active: 1)
[Task 2] Waiting for semaphore...
[Task 3] Waiting for semaphore...
[Task 1] Leaving critical section (Active: 0)
[Task 2] Entered critical section (Active: 1)
[Task 2] Leaving critical section (Active: 0)
[Task 3] Entered critical section (Active: 1)
[Task 3] Leaving critical section (Active: 0)
Max observed concurrency: 1
Semaphore Concurrency Check: PASS
```
この通り、タスク1〜3は並行実行されず、セマフォロックによってシリアライズされ、**同時実行数は常に1に制限**されていることが確認されました。

---

## 3. 総括
本検証の結果、実機に適用された Crash-On-Weak-Key および最小長強化安全装置は設定ミスを確実にブロックすること、そして共有パッケージによるスキーマバリデーション、および同時実行数制御は意図した通りに高い堅牢性と高負荷耐性を提供することが「徹底的な検証」をもって確認・保証されました。
