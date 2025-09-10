import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as brandSchema from "./schema/brand-interface.js";

// Usa la stessa connessione database ma con schema brand_interface
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL environment variable is not set");
}

const sql = neon(databaseUrl);

// Crea client Drizzle con schema brand_interface
export const db = drizzle(sql, { schema: brandSchema });

// Export schema per uso esterno
export * from "./schema/brand-interface.js";