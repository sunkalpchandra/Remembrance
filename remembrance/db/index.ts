import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool } from "@neondatabase/serverless";
import * as schema from "./schema";

// Ensure the connection string is available
const connectionString = process.env.DATABASE_URL as string;

// Initialize the Neon serverless pool
// This securely manages connections and works perfectly with Neon's pooled connection strings
const pool = new Pool({ connectionString });

// Export the Drizzle database instance
export const db = drizzle({ client: pool, schema });
