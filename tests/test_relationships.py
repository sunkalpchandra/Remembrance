from backend.relationships import extract_relationships

def test_extract_relationships():
    text = "I went to the zoo with Sarah."
    relationships = extract_relationships(text)

    assert isinstance(relationships, list)
    assert any("Sarah" in r for r in relationships)
    assert any("went" in r or "go" in r for r in relationships)