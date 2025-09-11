import express from "express";
import { spawn } from "child_process";
import { join } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { registerRoutes } from "./core/routes.js";
import { setupVite } from "./core/vite.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
import { seedCommercialAreas } from "./core/seed-areas.js";

const app = express();

// W3 Suite standalone - Brand Interface completamente isolato su porta 5001

app.use(express.json());

// Seed dati di riferimento
await seedCommercialAreas();

// Crea il server HTTP
const httpServer = await registerRoutes(app);

// Setup Vite per servire il frontend W3 Suite in development
if (process.env.NODE_ENV === "development") {
  await setupVite(app, httpServer);
}

// ==================== BRAND INTERFACE STANDALONE PROCESS ====================
// Brand Interface completamente isolato su porta 5001

let brandInterfaceProcess: any = null;

function startBrandInterface() {
  console.log("🚀 Starting Brand Interface standalone service...");
  
  // Path per Brand Interface (completo: frontend + backend su porta 5001)
  const BRAND_PATH = join(__dirname, "..", "..", "..", "backend", "brand-api");
  
  // Avvia Brand Interface standalone (porta 5001)
  brandInterfaceProcess = spawn("npx", ["tsx", "src/index.ts"], {
    cwd: BRAND_PATH,
    stdio: "inherit",
    env: {
      ...process.env,
      NODE_ENV: "development",
      BRAND_JWT_SECRET: "brand-dev-secret-2025"
    }
  });

  brandInterfaceProcess.on("error", (error: any) => {
    console.error("❌ Brand Interface failed to start:", error);
  });

  brandInterfaceProcess.on("exit", (code: any, signal: any) => {
    if (signal) {
      console.log(`🚫 Brand Interface killed with signal ${signal}`);
    } else {
      console.log(`🚫 Brand Interface exited with code ${code}`);
    }
    // Respawn after 2 seconds if not intentionally killed
    if (code !== 0 && signal !== "SIGTERM" && signal !== "SIGINT") {
      setTimeout(() => {
        console.log("🔄 Restarting Brand Interface...");
        startBrandInterface();
      }, 2000);
    }
  });

  console.log("✅ Brand Interface standalone service started");
  console.log("🌐 Brand Interface (frontend + backend): http://localhost:5001/brandinterface/login");
  console.log("🔌 Brand Interface API: http://localhost:5001/brand-api/health");
}

// Avvia Brand Interface solo in development come processo separato
if (process.env.NODE_ENV === "development") {
  startBrandInterface();
}

// W3 Suite cleanup - gestisce anche il processo Brand Interface separato
process.on("SIGTERM", () => {
  console.log("🚫 W3 Suite shutting down");
  if (brandInterfaceProcess) brandInterfaceProcess.kill("SIGTERM");
});

process.on("SIGINT", () => {
  console.log("🚫 W3 Suite shutting down");
  if (brandInterfaceProcess) brandInterfaceProcess.kill("SIGTERM");
  process.exit(0);
});

// Avvia il server sulla porta 5000
httpServer.listen(5000, "0.0.0.0", () => {
  console.log("W3 Suite server running on port 5000");
  console.log("Frontend available at: http://localhost:5000");
});