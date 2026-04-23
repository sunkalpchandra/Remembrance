import Koa from 'koa';
import Router from '@koa/router';
import bodyParser from 'koa-bodyparser';
import { createServer } from 'http';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool } from '@neondatabase/serverless';
import { eq } from 'drizzle-orm';
import { memories } from '../db/schema';
import { neo4jDriver, NEO4J_DB, upsertMemoryNode } from './neo4j';
import { initSockets } from './sockets';

dotenv.config();

const app = new Koa();
const router = new Router();
const server = createServer(app.callback());

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
const db = drizzle({ client: pool });

// CORS Middleware
app.use(async (ctx, next) => {
  ctx.set("Access-Control-Allow-Origin", "*");
  ctx.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  ctx.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (ctx.method === "OPTIONS") {
    ctx.status = 204;
    return;
  }
  await next();
});

app.use(bodyParser());

const UPLOAD_FOLDER = path.join(__dirname, "uploads");
if (!fs.existsSync(UPLOAD_FOLDER)) {
  fs.mkdirSync(UPLOAD_FOLDER, { recursive: true });
}

router.get("/health", (ctx) => {
  ctx.status = 200;
  ctx.body = { status: "healthy", message: "Remembrance backend is running." };
});

router.post("/upload", async (ctx) => {
  try {
    ctx.status = 200;
    ctx.body = {
      message: 'File upload endpoint',
      note: 'Install @koa/multer or koa-body to handle raw file streams'
    };
  } catch (error) {
    ctx.status = 500;
    ctx.body = { error: String(error) };
  }
});

router.get("/file/:filename", async (ctx) => {
  const filename = ctx.params.filename;
  const safeFilename = path.basename(filename);
  const filepath = path.join(UPLOAD_FOLDER, safeFilename);

  if (fs.existsSync(filepath)) {
    ctx.type = path.extname(filepath);
    ctx.body = fs.createReadStream(filepath);
  } else {
    ctx.status = 404;
    ctx.body = { error: "File not found" };
  }
});

// --- Neo4j Graph Routes ---

// Returns the memory knowledge graph for a user as {nodes, links}
router.get("/user/:userId/graph", async (ctx) => {
  const { userId } = ctx.params;
  const session = neo4jDriver.session({ database: NEO4J_DB });
  try {
    const result = await session.run(
      `MATCH (u:User {userId: $userId})
       OPTIONAL MATCH (u)-[:HAS_MEMORY]->(m:Memory)
       OPTIONAL MATCH (m)-[:IN_TOPIC]->(t:Topic)
       RETURN m, collect(DISTINCT t) AS topics`,
      { userId }
    );

    const nodes: any[] = [];
    const links: any[] = [];
    const nodeIds = new Set<string>();

    const userNodeId = `user_${userId}`;
    nodes.push({ id: userNodeId, label: "You", type: "user" });
    nodeIds.add(userNodeId);

    for (const record of result.records) {
      const m = record.get("m");
      if (!m) continue;

      const memId = m.properties.memoryId || m.identity.toString();
      const nodeId = `mem_${memId}`;

      if (!nodeIds.has(nodeId)) {
        const content: string = m.properties.content || "";
        const name: string = m.properties.name || "";
        nodes.push({
          id: nodeId,
          label: name || content.substring(0, 50),
          type: "memory",
          memoryId: memId,
          content,
        });
        nodeIds.add(nodeId);
      }
      links.push({ source: userNodeId, target: nodeId });

      const topicList = record.get("topics") || [];
      for (const t of topicList) {
        if (!t) continue;
        const topicName = t.properties.name;
        if (!topicName) continue;
        const topicNodeId = `topic_${userId}_${topicName}`;
        if (!nodeIds.has(topicNodeId)) {
          nodes.push({
            id: topicNodeId,
            label: topicName,
            type: "topic",
          });
          nodeIds.add(topicNodeId);
          links.push({ source: userNodeId, target: topicNodeId });
        }
        links.push({ source: topicNodeId, target: nodeId });
      }
    }

    ctx.body = { nodes, links };
  } catch (error) {
    console.error("[Neo4j] Error fetching graph:", error);
    ctx.status = 500;
    ctx.body = { error: "Failed to fetch graph data" };
  } finally {
    await session.close();
  }
});

// Rebuilds the Neo4j graph from the DB memories table. Used for backfilling
// existing rows that were saved before the live Neo4j sync was in place.
router.post("/user/:userId/populate_graph", async (ctx) => {
  const { userId } = ctx.params;
  try {
    const dbMems = await db
      .select()
      .from(memories)
      .where(eq(memories.userId, userId));

    let count = 0;
    for (const m of dbMems) {
      const content = m.summary || m.name || "";
      if (!content) continue;
      await upsertMemoryNode(userId, m.id, content, m.name || "");
      count++;
    }

    console.log(`[Neo4j] Backfilled ${count} memory nodes for user ${userId}`);
    ctx.body = { success: true, count };
  } catch (error) {
    console.error("[Neo4j] Error populating graph:", error);
    ctx.status = 500;
    ctx.body = { error: "Failed to populate graph" };
  }
});

app.use(router.routes());
app.use(router.allowedMethods());

initSockets(server);

const PORT = process.env.PORT || 5001;

server.listen(PORT, () => {
  console.log(`Remembrance Koa Server running on port ${PORT}`);
});
