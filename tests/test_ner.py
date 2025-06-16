from backend.ner import extract_entities

def test_extract_entities():
    text = "I visited Claire in Paris last July."
    result = extract_entities(text)

    assert isinstance(result, dict)
    assert "Claire" in result.get("PERSON", [])
    assert "Paris" in result.get("GPE", [])
    assert "last July" in result.get("DATE", [])