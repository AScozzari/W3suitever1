import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

export default defineConfig({
  out: "./src/db/migrations",
  schema: [
    "./src/db/schema/index.ts",           // Schema public (W3 Suite + Shared)
    "./src/db/schema/brand-interface.ts"  // Schema brand_interface (Brand Interface)
  ],
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  // Configure non-interactive mode
  introspect: {
    casing: "camel"
  },
  // Push settings for non-interactive operation
  verbose: true,
  strict: false
});