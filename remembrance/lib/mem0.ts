import MemoryClient from "mem0ai";

let client: MemoryClient | null = null;

// Lazily construct the Mem0 client so importing modules don't crash at
// load time when MEM0_API_KEY is unset. Callers receive null and skip
// memory syncing — the app falls back to the Postgres memories table.
export function getMem0(): MemoryClient | null {
  if (!process.env.MEM0_API_KEY) return null;
  if (!client) client = new MemoryClient({ apiKey: process.env.MEM0_API_KEY });
  return client;
}
