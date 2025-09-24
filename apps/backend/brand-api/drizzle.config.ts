import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required, ensure the database is provisioned");
}

export default defineConfig({
  schema: "./src/db/schema/brand-interface.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  schemaFilter: ["brand_interface"],
  verbose: true,
  strict: false
});