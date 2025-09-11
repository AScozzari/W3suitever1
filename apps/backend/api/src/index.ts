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
app.use(express.json());

// Seed dati di riferimento
await seedCommercialAreas();

// Crea il server HTTP
const httpServer = await registerRoutes(app);

// Setup Vite per servire il frontend in development
if (process.env.NODE_ENV === "development") {
  await setupVite(app, httpServer);
}

// ==================== BRAND INTERFACE SERVICES ====================
// Avvia Brand Interface come servizi supervisionati dal processo principale

let brandApiProcess: any = null;
let brandWebProcess: any = null;

function startBrandServices() {
  console.log("🚀 Starting Brand Interface services...");
  
  // Path per Brand Interface apps
  const BRAND_API_PATH = join(__dirname, "..", "..", "..", "backend", "brand-api");
  const BRAND_WEB_PATH = join(__dirname, "..", "..", "..", "frontend", "brand-web");
  
  // 1. Avvia Brand API (porta 5002)
  brandApiProcess = spawn("npx", ["tsx", "src/index.ts"], {
    cwd: BRAND_API_PATH,
    stdio: "inherit",
    env: {
      ...process.env,
      NODE_ENV: "development",
      BRAND_JWT_SECRET: "brand-dev-secret-2025"
    }
  });

  brandApiProcess.on("error", (error: any) => {
    console.error("❌ Brand API failed to start:", error);
  });

  brandApiProcess.on("exit", (code: any, signal: any) => {
    if (signal) {
      console.log(`🚫 Brand API killed with signal ${signal}`);
    } else {
      console.log(`🚫 Brand API exited with code ${code}`);
    }
    // Respawn after 2 seconds if not intentionally killed
    if (code !== 0 && signal !== "SIGTERM" && signal !== "SIGINT") {
      setTimeout(() => {
        console.log("🔄 Restarting Brand API...");
        startBrandServices();
      }, 2000);
    }
  });

  // 2. Avvia Brand Frontend (porta 5001) 
  setTimeout(() => {
    brandWebProcess = spawn("npx", ["vite", "--port", "5001", "--host", "0.0.0.0"], {
      cwd: BRAND_WEB_PATH,
      stdio: "inherit",
      env: {
        ...process.env,
        NODE_ENV: "development"
      }
    });

    brandWebProcess.on("error", (error: any) => {
      console.error("❌ Brand Frontend failed to start:", error);
    });

    brandWebProcess.on("exit", (code: any, signal: any) => {
      if (signal) {
        console.log(`🚫 Brand Frontend killed with signal ${signal}`);
      } else {
        console.log(`🚫 Brand Frontend exited with code ${code}`);
      }
    });

    console.log("✅ Brand Interface services started");
    console.log("📱 Brand Interface Frontend: http://localhost:5001/brandinterface/login");
    console.log("🔌 Brand Interface API: http://localhost:5002/brand-api/health");
  }, 2000);
}

// Avvia Brand Interface solo in development
if (process.env.NODE_ENV === "development") {
  startBrandServices();
}

// Cleanup al shutdown
process.on("SIGTERM", () => {
  if (brandApiProcess) brandApiProcess.kill("SIGTERM");
  if (brandWebProcess) brandWebProcess.kill("SIGTERM");
});

process.on("SIGINT", () => {
  if (brandApiProcess) brandApiProcess.kill("SIGTERM");
  if (brandWebProcess) brandWebProcess.kill("SIGTERM");
  process.exit(0);
});

// Avvia il server sulla porta 5000
httpServer.listen(5000, "0.0.0.0", () => {
  console.log("W3 Suite server running on port 5000");
  console.log("Frontend available at: http://localhost:5000");
});