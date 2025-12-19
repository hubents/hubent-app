import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

// Create the SQL client (connection caching is now enabled by default)
const sql = neon(process.env.DATABASE_URL!);

// Export the database instance with schema
export const db = drizzle(sql, { schema });

// Export schema for use in other files
export { schema };

// Type for the database instance
export type Database = typeof db;
