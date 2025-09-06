import express from "express";
import { registerRoutes } from "./core/routes.js";
import { setupVite } from "./core/vite.js";
import { seedCommercialAreas } from "./core/seed-areas.js";

const app = express();
app.use(express.json());

// Seed dati di riferimento
await seedCommercialAreas();

// Crea il server HTTP
const httpServer = await registerRoutes(app);

// Setup Vite per servire il frontend in development
if (process.env.NODE_ENV === "development") {
  await setupVite(app, httpServer);
}

// Avvia il server sulla porta 5000
httpServer.listen(5000, "0.0.0.0", () => {
  console.log("W3 Suite server running on port 5000");
  console.log("Frontend available at: http://localhost:5000");
});