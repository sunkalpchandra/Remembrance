from backend.graph_prep import prepare_for_graph

def test_prepare_for_graph_output():
    sample_memories = [
        {
            "text": "I went to Paris with Alice on July 4th.",
            "people": ["Alice"],
            "places": ["Paris"],
            "dates": ["July 4th"],
            "sentiment": "positive",
            "emotion": "joy"
        }
    ]

    cypher_output = prepare_for_graph(sample_memories)

    assert isinstance(cypher_output, str)
    assert "CREATE (m0:Memory" in cypher_output
    assert 'Alice' in cypher_output
    assert 'Paris' in cypher_output
    assert 'July 4th' in cypher_output
    assert 'sentiment: "positive"' in cypher_output
    assert 'emotion: "joy"' in cypher_output
    assert "MENTIONS" in cypher_output
    assert "LOCATED_IN" in cypher_output
    assert "ASSOCIATED_WITH" in cypher_output