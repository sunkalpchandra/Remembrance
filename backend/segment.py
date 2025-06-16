#1.1 - Memory Segmentation

import spacy 
from typing import List

nlp = spacy.load("en_core_web_sm")

def segment_memories(text: str, max_sentences_per_chunk: int = 2):
    doc = nlp(text)
    sentences = list(doc.sents)

    memory_units = []
    current_chunk = []

    for i, sentence in enumerate(sentences):
        sentence_text = sentence.text.strip()
        current_chunk.append(sentence_text)

        is_last = (i == len(sentences) - 1)
        is_transition = sentence_text.lower().startswith((
            "after", "then", "later", "afterwards", "suddenly"
        ))

        if len(current_chunk) >= max_sentences_per_chunk or is_transition or is_last:
            memory_units.append(" ".join(current_chunk))
            current_chunk = []


    return memory_units
    