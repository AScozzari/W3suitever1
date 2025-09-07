import express from "express";
import { registerBrandRoutes } from "./core/routes.js";
import { setupBrandVite } from "./core/vite.js";

console.log("🚀 Starting Brand Interface Server...");

const app = express();
app.use(express.json());

// Crea il server HTTP per Brand Interface
const httpServer = await registerBrandRoutes(app);

// Setup Vite per servire brand-web frontend in development
if (process.env.NODE_ENV === "development") {
  await setupBrandVite(app, httpServer);
}

// Avvia il server Brand sulla porta 5001
httpServer.listen(5001, "0.0.0.0", () => {
  console.log("✅ Brand Interface server running on port 5001");
  console.log("🌐 Brand Interface available at: http://localhost:5001");
});