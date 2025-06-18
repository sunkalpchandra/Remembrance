from backend.emotion import analyze_emotion

def test_emotion_analysis():
    text = "We laughed the entire day. It was so joyful!"
    result = analyze_emotion(text)

    assert isinstance(result, dict)
    assert "sentiment" in result
    assert "emotion" in result

    assert result["sentiment"] in ["positive", "neutral", "negative"]
    assert result["emotion"] in [
        "joy", "anger", "sadness", "fear", "disgust", "surprise", "love", "gratitude", "pride", "neutral"
    ]