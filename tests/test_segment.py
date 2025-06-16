from backend.segment import segment_memories

def test_segment_memories():
    text = (
        "I went to Disneyland with my daughter last summer. "
        "We had so much fun on the rollercoasters. "
        "Afterwards, we visited my sister in Santa Barbara."
    )
    result = segment_memories(text)
    assert isinstance(result, list)
    assert len(result) == 2