import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from app import embeddings

@pytest.mark.asyncio
async def test_embed_single_string():
    # embed に単一の文字列を渡した場合
    mock_response = MagicMock()
    mock_response.json.return_value = {
        "data": [
            {"embedding": [0.1, 0.2, 0.3], "index": 0}
        ]
    }
    
    with patch("httpx.AsyncClient.post", new_callable=AsyncMock, return_value=mock_response) as mock_post:
        result = await embeddings.embed("test text")
        
        assert result == [0.1, 0.2, 0.3]
        mock_post.assert_called_once()
        call_args = mock_post.call_args
        assert "/embeddings" in call_args[0][0]
        assert call_args[1]["json"]["input"] == "test text"

@pytest.mark.asyncio
async def test_embed_batch_list():
    # 複数ドキュメントをリストで渡した場合のバッチ処理テスト
    input_list = [f"doc {i}" for i in range(15)]  # 15件のデータ
    
    # バッチサイズを 5, 最大並行数を 2 に設定
    embeddings.EMBED_BATCH_SIZE = 5
    embeddings.EMBED_MAX_CONCURRENCY = 2
    
    # 15件なので 5件ずつのバッチが 3つ作成される
    mock_responses = []
    for i in range(3):
        mock_resp = MagicMock()
        mock_resp.json.return_value = {
            "data": [{"embedding": [float(k)], "index": idx} for idx, k in enumerate(range(i * 5, (i + 1) * 5))]
        }
        mock_responses.append(mock_resp)
    
    # モック呼び出しのカウント用
    call_count = 0
    async def side_effect(*args, **kwargs):
        nonlocal call_count
        res = mock_responses[call_count]
        call_count += 1
        return res
        
    with patch("httpx.AsyncClient.post", side_effect=side_effect) as mock_post:
        result = await embeddings.embed(input_list)
        
        assert len(result) == 15
        assert result == [[float(i)] for i in range(15)]
        assert mock_post.call_count == 3

@pytest.mark.asyncio
async def test_embed_order_preservation():
    # 順序の不整合が起きないことを確認
    input_list = ["doc1", "doc2"]
    embeddings.EMBED_BATCH_SIZE = 5
    embeddings.EMBED_MAX_CONCURRENCY = 2
    
    # APIレスポンスで index が逆順で返ってきた場合を想定
    mock_response = MagicMock()
    mock_response.json.return_value = {
        "data": [
            {"embedding": [2.0], "index": 1},
            {"embedding": [1.0], "index": 0}
        ]
    }
    
    with patch("httpx.AsyncClient.post", new_callable=AsyncMock, return_value=mock_response):
        result = await embeddings.embed(input_list)
        
        # ソートされて [1.0] が先頭、 [2.0] が次になるべき
        assert result == [[1.0], [2.0]]
