import { defineConfig } from 'drizzle-kit';
import * as dotenv from 'dotenv';

// Load environment variables for Drizzle Kit CLI
dotenv.config();

export default defineConfig({
  schema: './db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL as string,
  },
});
