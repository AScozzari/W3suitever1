import express from "express";
import { spawn } from "child_process";
import { join } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { registerRoutes } from "./core/routes.js";
import { setupVite } from "./core/vite.js";
import { createProxyMiddleware } from "http-proxy-middleware";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
import { seedCommercialAreas } from "./core/seed-areas.js";

const app = express();

// ELIMINATO: Proxy separato sostituito con Vite middleware diretto

// Proxy per Brand Interface API (porta 5002) - SOLO quello rimane
if (process.env.NODE_ENV === "development") {
  app.use('/brand-api', createProxyMiddleware({
    target: 'http://localhost:5002',
    changeOrigin: true,
    xfwd: true,
    pathRewrite: { '^/brand-api': '/brand-api' }, // Mantieni il prefisso
    logLevel: 'debug',
    onError: (err, req, res) => {
      console.error(`🔥 [BRAND API PROXY ERROR] ${req.url}:`, err.message);
      if (!res.headersSent) res.status(502).json({ error: 'Brand API proxy error', details: err.message });
    }
  }));
  console.log("🔀 Brand API proxy configured: /brand-api -> http://localhost:5002");
}

// RIMOSSO: Funzione per readiness check non più necessaria

// RIMOSSO: Redirect sbagliato che rompeva W3 Suite
// W3 Suite root dovrebbe essere servito da Vite middleware, non redirect a Brand Interface

app.use(express.json());

// Seed dati di riferimento
await seedCommercialAreas();

// Crea il server HTTP
const httpServer = await registerRoutes(app);

// ELIMINATO: WebSocket upgrade ora gestito da Vite middleware diretto

// Setup Vite per servire il frontend in development
if (process.env.NODE_ENV === "development") {
  await setupVite(app, httpServer);
  
  // NUOVO: Setup Brand Interface Vite middleware diretto
  const { setupBrandInterfaceVite } = await import("./core/vite.js");
  await setupBrandInterfaceVite(app, httpServer);
}

// ==================== BRAND INTERFACE SERVICES ====================
// Solo Brand API come servizio separato - Brand Frontend ora è middleware diretto

let brandApiProcess: any = null;

function startBrandServices() {
  console.log("🚀 Starting Brand Interface API service...");
  
  // Path per Brand Interface API
  const BRAND_API_PATH = join(__dirname, "..", "..", "..", "backend", "brand-api");
  
  // Avvia Solo Brand API (porta 5002) - Frontend ora è middleware
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

  console.log("✅ Brand Interface API service started");
  console.log("📱 Brand Interface Frontend: mounted as middleware at /brandinterface");
  console.log("🔌 Brand Interface API: http://localhost:5002/brand-api/health");
}

// Avvia Brand Interface solo in development
if (process.env.NODE_ENV === "development") {
  startBrandServices();
}

// Cleanup al shutdown
process.on("SIGTERM", () => {
  if (brandApiProcess) brandApiProcess.kill("SIGTERM");
  // brandWebProcess rimosso - ora è middleware
});

process.on("SIGINT", () => {
  if (brandApiProcess) brandApiProcess.kill("SIGTERM");
  // brandWebProcess rimosso - ora è middleware
  process.exit(0);
});

// Avvia il server sulla porta 5000
httpServer.listen(5000, "0.0.0.0", () => {
  console.log("W3 Suite server running on port 5000");
  console.log("Frontend available at: http://localhost:5000");
});