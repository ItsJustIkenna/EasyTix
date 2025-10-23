import { drizzle } from "drizzle-orm/node-postgres";
import { Client } from "pg";
import * as schema from "./schema";

// Create a reusable database connection
export const createDbConnection = () => {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });
  
  return { client, db: drizzle(client, { schema }) };
};

// For use in API routes
export const getDb = async () => {
  const { client, db } = createDbConnection();
  await client.connect();
  return { client, db };
};

// Close connection helper
export const closeDb = async (client: Client) => {
  await client.end();
};
