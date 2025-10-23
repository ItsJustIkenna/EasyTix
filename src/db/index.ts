import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

// Create connection pool (singleton pattern)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20, // Maximum 20 connections in pool
  idleTimeoutMillis: 30000, // Close idle connections after 30 seconds
  connectionTimeoutMillis: 2000, // Timeout after 2 seconds if pool is exhausted
  statement_timeout: 10000, // 10 seconds max per statement
});

// Pool event listeners for monitoring
pool.on('connect', (client) => {
  console.log('[DB Pool] New client connected. Total:', pool.totalCount, 'Idle:', pool.idleCount, 'Waiting:', pool.waitingCount);
});

pool.on('acquire', (client) => {
  console.log('[DB Pool] Client acquired. Waiting:', pool.waitingCount, 'Idle:', pool.idleCount);
});

pool.on('error', (err, client) => {
  console.error('[DB Pool] Unexpected error on idle client:', err);
});

pool.on('remove', (client) => {
  console.log('[DB Pool] Client removed. Total:', pool.totalCount);
});

// Export drizzle instance with pool
export const db = drizzle(pool, { schema });

// Export pool for raw queries when needed
export { pool };

// Legacy compatibility - for routes still using getDb/closeDb pattern
// TODO: Remove after migrating all routes to use db directly
export const getDb = async () => {
  return { client: pool, db };
};

export const closeDb = async () => {
  // No-op - pool manages connections automatically
};
