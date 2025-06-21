from transformers import pipeline
from typing import Dict

# Load sentiment classifier
sentiment_model = pipeline("sentiment-analysis", model="cardiffnlp/twitter-roberta-base-sentiment")

# Load emotion classifier 
emotion_model = pipeline("text-classification", model="j-hartmann/emotion-english-distilroberta-base", return_all_scores=True)

def analyze_emotion(text: str) -> dict:
    sentiment_model = pipeline("sentiment-analysis", model="cardiffnlp/twitter-roberta-base-sentiment")

    label_map = {
        "LABEL_0": "negative",
        "LABEL_1": "neutral",
        "LABEL_2": "positive"
    }

    sentiment_raw = sentiment_model(text)[0]
    sentiment = label_map.get(sentiment_raw["label"], sentiment_raw["label"])

    emotion_raw = emotion_model(text)[0]
    emotion = max(emotion_raw, key=lambda x: x["score"])["label"].lower()

    return {
        "sentiment": sentiment,
        "emotion": emotion
    }