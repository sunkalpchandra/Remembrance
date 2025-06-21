#1.2 - Normal Entity Recognition

import spacy
from typing import Dict

nlp = spacy.load("en_core_web_sm")

def extract_entities(text: str) -> Dict[str, list]:
    doc = nlp(text)
    entities = {"PERSON": [], "GPE": [], "DATE": []}

    for ent in doc.ents:
        if ent.label_ in entities:
            entities[ent.label_].append(ent.text)
    
    return entities