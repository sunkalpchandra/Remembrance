import neo4j, { Driver } from "neo4j-driver";

// Lazy driver: Neo4j is optional, and building a driver from an unset
// NEO4J_URL at import time would crash the whole backend process.
let _driver: Driver | null = null;

export function getNeo4jDriver(): Driver | null {
  if (!process.env.NEO4J_URL) return null;
  if (!_driver) {
    _driver = neo4j.driver(
      process.env.NEO4J_URL,
      neo4j.auth.basic(
        process.env.NEO4J_USERNAME || "neo4j",
        process.env.NEO4J_PASSWORD || "",
      ),
    );
  }
  return _driver;
}

export const NEO4J_DB = process.env.NEO4J_DATABASE || "neo4j";

export async function upsertMemoryNode(
  userId: string,
  memoryId: string,
  content: string,
  name?: string,
) {
  const driver = getNeo4jDriver();
  if (!driver) return;
  const session = driver.session({ database: NEO4J_DB });
  try {
    await session.run(
      `MERGE (u:User {userId: $userId})
       MERGE (m:Memory {memoryId: $memoryId})
       SET m.content = $content,
           m.name = $name,
           m.updatedAt = timestamp()
       MERGE (u)-[:HAS_MEMORY]->(m)`,
      { userId, memoryId, content, name: name || "" },
    );
    console.log(`[Neo4j] upserted Memory ${memoryId} for user ${userId}`);
  } catch (err) {
    console.error("[Neo4j] upsertMemoryNode failed:", err);
    throw err;
  } finally {
    await session.close();
  }
}

export async function linkTopic(
  userId: string,
  memoryId: string,
  topicName: string,
) {
  const driver = getNeo4jDriver();
  if (!driver) return;
  const session = driver.session({ database: NEO4J_DB });
  try {
    await session.run(
      `MERGE (u:User {userId: $userId})
       MERGE (t:Topic {userId: $userId, name: $topicName})
       MERGE (u)-[:HAS_TOPIC]->(t)
       WITH t
       MATCH (m:Memory {memoryId: $memoryId})
       MERGE (m)-[:IN_TOPIC]->(t)`,
      { userId, memoryId, topicName },
    );
  } catch (err) {
    console.error("[Neo4j] linkTopic failed:", err);
  } finally {
    await session.close();
  }
}
