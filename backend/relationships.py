import spacy
from typing import List, Tuple

nlp = spacy.load("en_core_web_sm")

def extract_relationships(text: str) -> List[Tuple[str, str, str]]:
    doc = nlp(text)
    relationships = []

    for sent in doc.sents:
        subj = None
        obj = None
        verb = None

        for token in sent:
            if "subj" in token.dep_:
                subj = token.text
            elif "obj" in token.dep_:
                obj = token.text
            elif token.pos_ == "VERB":
                verb = token.lemma_

        if subj and verb and obj:
            relationships.append((subj, verb, obj))

    return relationships