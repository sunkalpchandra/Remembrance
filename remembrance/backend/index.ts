import Koa from 'koa';
import Router from '@koa/router';
import bodyParser from 'koa-bodyparser';
import { createServer } from 'http';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { initSockets } from './sockets'; // We will implement this in sockets.ts

dotenv.config();

const app = new Koa();
const router = new Router();
const server = createServer(app.callback());

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

// Setup upload directory
const UPLOAD_FOLDER = path.join(__dirname, "uploads");
if (!fs.existsSync(UPLOAD_FOLDER)) {
  fs.mkdirSync(UPLOAD_FOLDER, { recursive: true });
}

// --- HTTP Routes ported from adk_memo.py ---

router.get("/health", (ctx) => {
  ctx.status = 200;
  ctx.body = { status: "healthy", message: "Remembrance backend is running." };
});

// Since standard bodyparser doesn't handle multipart/form-data,
// this is a simplified upload handler placeholder that mimics the adk_memo.py endpoint.
router.post("/upload", async (ctx) => {
  try {
    // In a full implementation, you'd use a package like @koa/multer or koa-body here
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
  // Prevent directory traversal attacks
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

app.use(router.routes());
app.use(router.allowedMethods());

// Initialize WebSockets via Socket.io
initSockets(server);

const PORT = process.env.PORT || 5001;

server.listen(PORT, () => {
  console.log(`Remembrance Koa Server running on port ${PORT}`);
});
