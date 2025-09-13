import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { exec, spawn } from "child_process";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { registerRoutes } from "./core/routes.js";
import { seedCommercialAreas } from "./core/seed-areas.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Global process references for lifecycle management
let brandFrontendProcess = null;

// Start nginx reverse proxy and backend
startNginxAndBackend();

async function startNginxAndBackend() {
  const port = Number(process.env.PORT || 3000);
  const nginxTemplatePath = path.resolve(process.cwd(), "nginx.template.conf");
  const nginxGeneratedPath = "/tmp/nginx.generated.conf";
  const nginxPrefix = "/tmp/w3suite-nginx";
  const nginxPidPath = `${nginxPrefix}/nginx.pid`;
  
  console.log(`🔧 Generating nginx config for PLATFORM PORT ${port}...`);
  console.log(`📍 REPLIT PLATFORM PORT: ${process.env.PORT || 'NOT SET - using fallback 3000'}`);
  
  // Create nginx prefix directory structure for process isolation
  if (!existsSync(nginxPrefix)) {
    mkdirSync(nginxPrefix, { recursive: true });
    console.log(`📁 Created nginx prefix directory: ${nginxPrefix}`);
  }
  
  // Create logs subdirectory
  const nginxLogsDir = `${nginxPrefix}/logs`;
  if (!existsSync(nginxLogsDir)) {
    mkdirSync(nginxLogsDir, { recursive: true });
    console.log(`📁 Created nginx logs directory: ${nginxLogsDir}`);
  }
  
  // Workaround: Create system-level nginx directory to satisfy hardcoded compile paths
  try {
    const systemNginxDir = '/var/log/nginx';
    if (!existsSync(systemNginxDir)) {
      mkdirSync(systemNginxDir, { recursive: true });
      console.log(`🔧 Created system nginx directory: ${systemNginxDir}`);
    }
  } catch (error) {
    console.log(`⚠️ Could not create system nginx directory (may need sudo): ${error.message}`);
    // Try alternative - use /tmp paths instead
    console.log(`🔄 Using /tmp fallback paths...`);
  }
  
  // Generate nginx.conf from template
  try {
    const templateContent = readFileSync(nginxTemplatePath, 'utf8');
    const generatedContent = templateContent.replace(/{{PORT}}/g, String(port));
    writeFileSync(nginxGeneratedPath, generatedContent);
    console.log(`✅ Generated nginx config: ${nginxGeneratedPath}`);
  } catch (error) {
    console.error("❌ Failed to generate nginx config:", error);
    throw error;
  }
  
  console.log("🔧 Starting nginx reverse proxy...");
  
  try {
    // 1. Preflight check - validate nginx configuration with explicit paths
    console.log("📋 Validating nginx configuration...");
    await new Promise((resolve, reject) => {
      // Use explicit error-log and pid-path to override compile defaults
      const testCmd = `nginx -p ${nginxPrefix} -t -c ${nginxGeneratedPath} -g 'error_log ${nginxPrefix}/logs/nginx_error.log; pid ${nginxPidPath};'`;
      exec(testCmd, (error, stdout, stderr) => {
        if (error) {
          console.error("❌ Nginx configuration validation failed:");
          console.error(stderr);
          reject(error);
          return;
        }
        console.log("✅ Nginx configuration valid");
        resolve(stdout);
      });
    });

    // 2. Stop existing nginx instance safely using scoped approach
    try {
      console.log("🛑 Stopping existing nginx instance...");
      if (existsSync(nginxPidPath)) {
        console.log(`📋 Found existing PID file: ${nginxPidPath}`);
        try {
          const pidContent = readFileSync(nginxPidPath, 'utf8').trim();
          if (pidContent) {
            console.log(`🎯 Sending SIGQUIT to PID ${pidContent}`);
            process.kill(parseInt(pidContent), 'SIGQUIT');
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        } catch (pidError) {
          console.log("⚠️ PID-based stop failed, trying scoped nginx stop...");
          await new Promise((resolve) => {
            exec(`nginx -p ${nginxPrefix} -g 'pid ${nginxPidPath};' -s quit`, () => {
              setTimeout(resolve, 1000);
            });
          });
        }
      } else {
        console.log("ℹ️ No existing nginx PID file found");
      }
    } catch (error) {
      console.log("⚠️ Existing nginx cleanup completed (may not have been running)");
    }

    // 3. Start nginx with isolated prefix and explicit path overrides
    console.log(`🚀 Starting nginx on port ${port} with prefix ${nginxPrefix}...`);
    const nginxProcess = spawn("nginx", [
      "-p", nginxPrefix,
      "-c", nginxGeneratedPath, 
      "-g", `error_log ${nginxPrefix}/logs/nginx_error.log warn; pid ${nginxPidPath}; daemon off;`
    ], {
      stdio: ["ignore", "pipe", "pipe"],
      detached: false
    });

    nginxProcess.stdout?.on("data", (data) => {
      console.log(`[nginx]: ${data.toString().trim()}`);
    });

    nginxProcess.stderr?.on("data", (data) => {
      console.error(`[nginx error]: ${data.toString().trim()}`);
    });

    nginxProcess.on("error", (error) => {
      console.error("❌ Nginx process error:", error);
      process.exit(1);
    });

    nginxProcess.on("exit", (code, signal) => {
      console.error(`❌ Nginx exited with code ${code}, signal ${signal}`);
      
      // Inspect error log for diagnosis
      try {
        const errorLogPath = `${nginxPrefix}/logs/error.log`;
        if (existsSync(errorLogPath)) {
          const errorLog = readFileSync(errorLogPath, 'utf8');
          const lastLines = errorLog.split('\n').slice(-5).join('\n');
          console.error(`📋 Last nginx error log entries:\n${lastLines}`);
        }
      } catch (logError) {
        console.log("⚠️ Could not read nginx error log");
      }
      
      // Simple watchdog - attempt controlled restart with backoff
      if (code !== 0 && signal !== 'SIGTERM' && signal !== 'SIGQUIT') {
        console.log(`🔄 Attempting nginx restart after unexpected exit (code: ${code}, signal: ${signal})...`);
        setTimeout(() => {
          startNginxAndBackend().catch((restartError) => {
            console.error("❌ Nginx restart failed:", restartError);
            process.exit(1);
          });
        }, 3000); // 3 second backoff
        return;
      }
      
      if (code !== 0) {
        process.exit(1);
      }
    });

    // 4. Health check verification - wait for nginx to be ready
    console.log("🏥 Waiting for nginx health check...");
    const maxRetries = 10;
    let retries = 0;
    
    while (retries < maxRetries) {
      try {
        await new Promise((resolve, reject) => {
          const testReq = exec(`curl -s -f http://localhost:${port}/health`, (error, stdout, stderr) => {
            if (error) {
              reject(error);
              return;
            }
            if (stdout.includes("nginx proxy healthy")) {
              resolve(stdout);
            } else {
              reject(new Error("Health check response invalid"));
            }
          });
        });
        
        console.log("✅ Nginx reverse proxy is healthy and ready on port " + port);
        break;
        
      } catch (error) {
        retries++;
        if (retries >= maxRetries) {
          console.error("❌ Nginx health check failed after", maxRetries, "attempts");
          nginxProcess.kill();
          throw new Error("Nginx startup verification failed");
        }
        console.log(`⏳ Health check attempt ${retries}/${maxRetries} failed, retrying...`);
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    // Handle graceful shutdown with scoped control
    const gracefulShutdown = () => {
      console.log("🛑 Shutting down all services gracefully...");
      
      // Shutdown Brand Frontend first
      if (brandFrontendProcess) {
        console.log("🎨 Stopping Brand Frontend...");
        brandFrontendProcess.kill("SIGTERM");
        brandFrontendProcess = null;
      }
      
      // Shutdown nginx
      console.log("🛑 Shutting down nginx gracefully...");
      if (existsSync(nginxPidPath)) {
        try {
          const pidContent = readFileSync(nginxPidPath, 'utf8').trim();
          if (pidContent) {
            process.kill(parseInt(pidContent), 'SIGQUIT');
            return;
          }
        } catch (error) {
          console.log("⚠️ PID-based shutdown failed, using process handle");
        }
      }
      nginxProcess.kill("SIGTERM");
    };

    process.on("SIGTERM", gracefulShutdown);
    process.on("SIGINT", gracefulShutdown);

  } catch (error) {
    console.error("❌ Failed to start nginx:", error);
    console.error("🔍 Check nginx.conf and system nginx installation");
    process.exit(1);
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
    if (brandFrontendProcess) {
      console.log("🎨 Stopping Brand Frontend from backend shutdown...");
      brandFrontendProcess.kill("SIGTERM");
      brandFrontendProcess = null;
    }
    process.exit(0);
  });

  process.on("SIGINT", () => {
    console.log("🚫 W3 Suite backend shutting down");
    if (brandFrontendProcess) {
      console.log("🎨 Stopping Brand Frontend from backend shutdown...");
      brandFrontendProcess.kill("SIGTERM");
      brandFrontendProcess = null;
    }
    process.exit(0);
  });

  // W3 Suite backend on dedicated port 3004 (internal only)
  const backendPort = parseInt(process.env.W3_BACKEND_PORT || '3004', 10);

  httpServer.listen(backendPort, "127.0.0.1", () => {
    console.log(`🚀 W3 Suite backend running on localhost:${backendPort} (internal only)`);
    console.log(`🔌 API available internally at: http://localhost:${backendPort}/api`);
    console.log(`🔍 Health check: http://localhost:${backendPort}/api/tenants`);
    
    // Start Brand Frontend after backend is ready
    startBrandFrontend();
  });
}

async function startBrandFrontend() {
  console.log("🎨 Starting Brand Frontend on port 3001...");
  
  try {
    const brandFrontendDir = path.resolve(process.cwd(), "apps/frontend/brand-web");
    
    // Verify Brand Frontend directory exists
    if (!existsSync(brandFrontendDir)) {
      throw new Error(`Brand Frontend directory not found: ${brandFrontendDir}`);
    }
    
    // Environment configuration for Brand Frontend
    const brandFrontendEnv = {
      ...process.env,
      HOST: "0.0.0.0",
      PORT: "3001",
      NODE_ENV: "development"
    };
    
    // Spawn Brand Frontend Vite development server using npm run dev
    brandFrontendProcess = spawn("npm", ["run", "dev"], {
      cwd: brandFrontendDir,
      env: brandFrontendEnv,
      stdio: "inherit",
      detached: false
    });
    
    brandFrontendProcess.on("error", (error) => {
      console.error("❌ Brand Frontend process error:", error);
      brandFrontendProcess = null;
    });
    
    brandFrontendProcess.on("exit", (code, signal) => {
      console.log(`🎨 Brand Frontend exited with code ${code}, signal ${signal}`);
      brandFrontendProcess = null;
      
      // Attempt restart on unexpected exit
      if (code !== 0 && signal !== 'SIGTERM' && signal !== 'SIGINT') {
        console.log("🔄 Attempting Brand Frontend restart after unexpected exit...");
        setTimeout(() => {
          startBrandFrontend().catch((restartError) => {
            console.error("❌ Brand Frontend restart failed:", restartError);
          });
        }, 3000);
      }
    });
    
    // Health check verification - wait for Brand Frontend to be ready
    console.log("🏥 Waiting for Brand Frontend health check...");
    const maxRetries = 20; // More retries for Vite startup
    let retries = 0;
    
    while (retries < maxRetries) {
      try {
        await new Promise((resolve, reject) => {
          const testReq = exec("curl -s -f http://localhost:3001", (error, stdout, stderr) => {
            if (error) {
              reject(error);
              return;
            }
            if (stdout && stdout.length > 0) {
              resolve(stdout);
            } else {
              reject(new Error("Health check response empty"));
            }
          });
        });
        
        console.log("✅ Brand Frontend started successfully on port 3001");
        console.log("🌐 Brand Frontend accessible at: http://localhost:3001");
        break;
        
      } catch (error) {
        retries++;
        if (retries >= maxRetries) {
          console.error("❌ Brand Frontend health check failed after", maxRetries, "attempts");
          console.log("⚠️ Brand Frontend may still be starting up - continuing...");
          break;
        }
        console.log(`⏳ Brand Frontend health check attempt ${retries}/${maxRetries} failed, retrying...`);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Longer wait for Vite
      }
    }
    
  } catch (error) {
    console.error("❌ Failed to start Brand Frontend:", error);
    console.log("⚠️ Continuing without Brand Frontend...");
  }
}