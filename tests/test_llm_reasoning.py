from backend.app.llm import _assistant_visible_text


def test_assistant_visible_text_suppresses_reasoning():
    # Regular content
    msg1 = {"content": "Hello, world!", "reasoning": "Thinking step 1"}
    assert _assistant_visible_text(msg1) == "Hello, world!"

    # Delta chunk with reasoning_content only
    msg2 = {"content": None, "reasoning_content": "Internal thought process"}
    assert _assistant_visible_text(msg2) == ""

    # Empty content
    msg3 = {"reasoning": "Only reasoning"}
    assert _assistant_visible_text(msg3) == ""

    # List content
    msg4 = {"content": [{"type": "text", "text": "Part 1"}]}
    assert _assistant_visible_text(msg4) == "[{'type': 'text', 'text': 'Part 1'}]"
