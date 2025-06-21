# Converts structured memory data into Cypher query strings for Neo4j ingestion.
# Each memory becomes a Memory node linked to entities (people, places, dates, etc.) with appropriate relationships (e.g. MENTIONS, LOCATED_IN, OCCURRED_ON).

# Returns: A string of Cypher queries ready to run in Neo4j.

from typing import List

def prepare_for_graph(memories: List[dict]) -> str:
    """
    Converts memory data into Cypher queries for Neo4j insertion.
    Returns a single string of CREATE statements.
    """
    queries = []

    for mem_id, memory in enumerate(memories):
        memory_text = memory["text"].replace('"', '\\"')
        sentiment = memory.get("sentiment", "neutral")
        emotion = memory.get("emotion", "neutral")

        # Memory node
        queries.append(
            f'CREATE (m{mem_id}:Memory {{id: {mem_id}, text: "{memory_text}", sentiment: "{sentiment}", emotion: "{emotion}"}})'
        )

        # People nodes + relationships
        for person in memory.get("people", []):
            person = person.replace('"', '\\"')
            queries.append(
                f'MERGE (p:Person {{name: "{person}"}})\nCREATE (m{mem_id})-[:MENTIONS]->(p)'
            )

        # Places nodes + relationships
        for place in memory.get("places", []):
            place = place.replace('"', '\\"')
            queries.append(
                f'MERGE (l:Place {{name: "{place}"}})\nCREATE (m{mem_id})-[:LOCATED_IN]->(l)'
            )

        # Dates + relationships
        for date in memory.get("dates", []):
            queries.append(
                f'MERGE (d:Date {{value: "{date}"}})\nCREATE (m{mem_id})-[:ASSOCIATED_WITH]->(d)'
            )

    return "\n".join(queries)
