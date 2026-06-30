"""RAG 埋め込みパフォーマンス測定 / 順序保証検証ベンチマークスクリプト

コンテナ内で実行して、モデル埋め込みの処理速度と順序整合性が担保されているかを検証します。
実行コマンド:
    docker compose exec rag-app python /app/benchmark.py
"""

import sys
import os
import asyncio
import time

# アプリケーションモジュールへのパスを追加
sys.path.append("/app")

try:
    from app import embeddings
except ImportError:
    print("エラー: app.embeddings モジュールをインポートできません。/app ディレクトリ内で実行してください。")
    sys.exit(1)

# テスト用の250個 of チャンクテキストを自動生成
DUMMY_TEXTS = [
    f"これはテスト用のダミーテキストチャンク第 {i} 番目の文書です。バッチ分割処理が適切に動作しているかを確認するための検証用文言が含まれています。十分に長いテキストサイズを持つように文面を長くしています。"
    for i in range(250)
]

async def run_benchmark(batch_size: int, concurrency: int):
    # 環境変数を動的に上書き設定
    os.environ["EMBED_BATCH_SIZE"] = str(batch_size)
    os.environ["EMBED_MAX_CONCURRENCY"] = str(concurrency)
    embeddings.EMBED_BATCH_SIZE = batch_size
    embeddings.EMBED_MAX_CONCURRENCY = concurrency
    
    print(f"\n--- 計測: バッチサイズ={batch_size}, 同時実行制限={concurrency} ---")
    
    start_time = time.time()
    try:
        results = await embeddings.embed(DUMMY_TEXTS)
        elapsed = time.time() - start_time
        
        # 1. 取得数の正確性確認
        assert len(results) == len(DUMMY_TEXTS), f"戻り値の数が不一致です: {len(results)} != {len(DUMMY_TEXTS)}"
        
        # 2. ベクトルの正常性確認 (次元数が256であること)
        assert len(results[0]) == 256, f"ベクトルの次元数が不一致です: {len(results[0])} != 256"
        
        print(f"✅ 成功! 処理時間: {elapsed:.2f}秒 (1チャンクあたり平均: {(elapsed/len(DUMMY_TEXTS))*1000:.1f}ms)")
        return elapsed
    except Exception as e:
        print(f"❌ エラー発生: {e}")
        return None

async def test_order_preservation():
    print("\n--- 検証: 入力順序 of 整合性保証テスト ---")
    
    # 異なる特徴的な短い文章
    unique_texts = [
        "富士山は日本で最も高い山です。",
        "PythonはデータサイエンスやAI開発で広く使われています。",
        "デジタル庁は日本の行政手続きのデジタル化を推進しています。",
        "桜は日本の春を代表する花の一つです。",
        "ベクトルデータベースは高速なセマンティック検索を可能にします。"
    ]
    
    # 単体でそれぞれ埋め込んだ結果（基準ベクトル）を取得
    baseline_vectors = []
    for text in unique_texts:
        vec = await embeddings.embed(text)
        baseline_vectors.append(vec)
        
    # バッチで一括埋め込みを実行
    batch_results = await embeddings.embed(unique_texts)
    
    # 順序とベクトル内容が完全に一致することを確認
    for i, baseline_vec in enumerate(baseline_vectors):
        batch_vec = batch_results[i]
        # ベクトルの各値が完全に等しいことを確認（浮動小数点の誤差を考慮して近似比較）
        for val1, val2 in zip(baseline_vec, batch_vec):
            assert abs(val1 - val2) < 1e-5, f"インデックス {i} でベクトルの不一致が発生しました！順序がズレています。"
            
    print("✅ 順序保証テスト成功! 一括バッチ処理の出力順序は元の入力順と100%一致しています。")

async def main():
    print("====================================================")
    print("   RAG 埋め込みバッチ分割・並行制御ベンチマークツール")
    print("====================================================")
    
    # 順序保証テスト
    await test_order_preservation()
    
    # さまざまな構成でパフォーマンステスト
    configs = [
        (250, 1),  # 分割なし、直列
        (100, 5),  # 100件ずつ5並行 (デフォルト推奨設定に近い形式)
        (50, 5),   # 50件ずつ5並行
        (20, 10)   # 20件ずつ10並行
    ]
    
    for bs, cc in configs:
        await run_benchmark(bs, cc)

if __name__ == "__main__":
    asyncio.run(main())
