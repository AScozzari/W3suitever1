import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { exec } from "child_process";
import { registerRoutes } from "./core/routes.js";
import { seedCommercialAreas } from "./core/seed-areas.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Start nginx reverse proxy and backend
startNginxAndBackend();

async function startNginxAndBackend() {
  // Start nginx reverse proxy first
  console.log("🔧 Starting nginx reverse proxy...");
  
  try {
    // Kill any existing nginx processes
    exec("pkill nginx", (error) => {
      // Ignore errors - nginx might not be running
      
      // Start nginx with our configuration
      const nginxProcess = exec("nginx -c $(pwd)/nginx.conf -g 'daemon off;'", (error, stdout, stderr) => {
        if (error) {
          console.error("❌ Nginx startup error:", error);
          return;
        }
      });
      
      console.log("✅ Nginx reverse proxy started on port 5000");
    });
    
    // Wait a moment for nginx to start
    await new Promise(resolve => setTimeout(resolve, 1000));
    
  } catch (error) {
    console.error("❌ Failed to start nginx:", error);
  }
  
  // Start backend
  await startBackend();
}

async function startBackend() {
  const app = express();

  // W3 Suite backend standalone

  // CORS configuration - accept requests from frontend only
  app.use(cors({
    origin: [
      'http://localhost:3000',  // W3 Suite frontend
      'http://127.0.0.1:3000'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-ID', 'X-Demo-User', 'X-Auth-Session']
  }));

  app.use(express.json());

  // Serve static files from public directory
  const publicPath = path.join(__dirname, "../../../../public");
  app.use(express.static(publicPath));

  // Seed dati di riferimento
  await seedCommercialAreas();

  // Crea il server HTTP
  const httpServer = await registerRoutes(app);

  // API-only backend - frontend apps handle their own routing
  // Only serve API, OAuth2, and well-known endpoints

  // W3 Suite backend cleanup
  process.on("SIGTERM", () => {
    console.log("🚫 W3 Suite backend shutting down");
    process.exit(0);
  });

  process.on("SIGINT", () => {
    console.log("🚫 W3 Suite backend shutting down");
    process.exit(0);
  });

  // W3 Suite backend on dedicated port 3004
  const port = parseInt(process.env.W3_BACKEND_PORT || '3004', 10);

  httpServer.listen(port, "0.0.0.0", () => {
    console.log(`🚀 W3 Suite backend running on fixed port ${port}`);
    console.log(`🔌 API available at: http://localhost:${port}/api`);
    console.log(`🔍 Health check: http://localhost:${port}/api/tenants`);
  });
}