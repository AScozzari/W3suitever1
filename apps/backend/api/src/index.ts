import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { exec, spawn, ChildProcess } from "child_process";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { registerRoutes } from "./core/routes.js";
import { seedCommercialAreas } from "./core/seed-areas.js";
import { startWorkflowWorker, stopWorkflowWorker } from "./queue/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Global process references for lifecycle management
let brandFrontendProcess: ChildProcess | null = null;
let w3FrontendProcess: ChildProcess | null = null;
let brandBackendProcess: ChildProcess | null = null;
let voiceGatewayProcess: ChildProcess | null = null;
let nginxProcess: ChildProcess | null = null;
let backendServer: any = null;
let isShuttingDown = false;

// Feature flag for nginx management  
const ENABLE_EMBEDDED_NGINX = process.env.DISABLE_EMBEDDED_NGINX !== 'true';

// Stop all services cleanly before restart
async function stopAllServices() {
  if (isShuttingDown) {
    console.log("⏳ Already shutting down services...");
    return;
  }
  
  isShuttingDown = true;
  console.log("🛑 Stopping all services for clean restart...");
  
  try {
    // 1. Stop nginx gracefully
    if (nginxProcess) {
      console.log("  → Stopping nginx...");
      try {
        nginxProcess.kill('SIGTERM');
        nginxProcess = null;
      } catch (e) {
        console.log("  → Nginx already stopped");
      }
    }
    
    // 2. Stop frontend processes
    if (w3FrontendProcess) {
      console.log("  → Stopping W3 Frontend...");
      try {
        w3FrontendProcess.kill('SIGTERM');
        w3FrontendProcess = null;
      } catch (e) {}
    }
    
    if (brandFrontendProcess) {
      console.log("  → Stopping Brand Frontend...");
      try {
        brandFrontendProcess.kill('SIGTERM');
        brandFrontendProcess = null;
      } catch (e) {}
    }
    
    // 3. Stop backend processes
    if (brandBackendProcess) {
      console.log("  → Stopping Brand Backend...");
      try {
        brandBackendProcess.kill('SIGTERM');
        brandBackendProcess = null;
      } catch (e) {}
    }
    
    if (voiceGatewayProcess) {
      console.log("  → Stopping Voice Gateway...");
      try {
        voiceGatewayProcess.kill('SIGTERM');
        voiceGatewayProcess = null;
      } catch (e) {}
    }
    
    if (backendServer) {
      console.log("  → Stopping W3 Backend...");
      try {
        await new Promise((resolve) => {
          backendServer.close(() => resolve(undefined));
        });
        backendServer = null;
      } catch (e) {}
    }
    
    // 4. Clean up nginx pid file and force kill any remaining nginx
    const nginxPrefix = "/tmp/w3suite-nginx";
    const nginxPidPath = `${nginxPrefix}/nginx.pid`;
    
    try {
      if (existsSync(nginxPidPath)) {
        const pidContent = readFileSync(nginxPidPath, 'utf8').trim();
        if (pidContent) {
          process.kill(parseInt(pidContent), 'SIGKILL');
        }
      }
    } catch (e) {}
    
    // 5. Force kill any lingering nginx processes
    await new Promise((resolve) => {
      exec("pkill -f w3suite-nginx", () => {
        setTimeout(resolve, 2000); // Wait 2 seconds for processes to die
      });
    });
    
    console.log("✅ All services stopped cleanly");
  } catch (error) {
    console.error("⚠️ Error during service shutdown:", error);
  } finally {
    isShuttingDown = false;
  }
}

// Start application based on feature flag
if (ENABLE_EMBEDDED_NGINX) {
  console.log("🔧 Starting in EMBEDDED NGINX mode (legacy/rollback)");
  console.log("📋 Nginx process management: ENABLED");
  console.log("🎯 Frontend services management: ENABLED");
  startNginxAndBackend();
} else {
  console.log("🔧 Starting in PURE BACKEND mode (nginx-external)");
  console.log("📋 Nginx process management: DISABLED");
  console.log("🎯 Frontend services management: DISABLED");
  console.log("🚀 Backend will run standalone on platform port (ENV PORT)");
  startBackendOnly();
}

async function startNginxAndBackend() {
  const port = Number(process.env.PORT || 3000);
  const nginxTemplatePath = path.resolve(process.cwd(), "nginx.template.conf");
  const nginxGeneratedPath = "/tmp/nginx.generated.conf";
  const nginxPrefix = "/tmp/w3suite-nginx";
  const nginxPidPath = `${nginxPrefix}/nginx.pid`;
  
  // Generating nginx config for platform port
  
  // Create nginx prefix directory structure for process isolation
  if (!existsSync(nginxPrefix)) {
    mkdirSync(nginxPrefix, { recursive: true });
  }
  
  // Create logs subdirectory
  const nginxLogsDir = `${nginxPrefix}/logs`;
  if (!existsSync(nginxLogsDir)) {
    mkdirSync(nginxLogsDir, { recursive: true });
  }
  
  // Workaround: Create system-level nginx directory to satisfy hardcoded compile paths
  try {
    const systemNginxDir = '/var/log/nginx';
    if (!existsSync(systemNginxDir)) {
      mkdirSync(systemNginxDir, { recursive: true });
    }
  } catch (error) {
    // Could not create system nginx directory - using /tmp fallback paths
  }
  
  // Generate nginx.conf from template
  try {
    const templateContent = readFileSync(nginxTemplatePath, 'utf8');
    const generatedContent = templateContent.replace(/{{PORT}}/g, String(port));
    writeFileSync(nginxGeneratedPath, generatedContent);
  } catch (error) {
    console.error("Failed to generate nginx config:", error);
    throw error;
  }
  
  // Starting nginx reverse proxy
  
  try {
    // 1. Preflight check - validate nginx configuration with explicit paths
    await new Promise((resolve, reject) => {
      // Use explicit error-log and pid-path to override compile defaults
      const testCmd = `nginx -p ${nginxPrefix} -t -c ${nginxGeneratedPath} -g 'error_log ${nginxPrefix}/logs/nginx_error.log; pid ${nginxPidPath};'`;
      exec(testCmd, (error, stdout, stderr) => {
        if (error) {
          console.error("Nginx configuration validation failed:");
          console.error(stderr);
          reject(error);
          return;
        }
        resolve(stdout);
      });
    });

    // 2. Stop existing nginx instance safely using scoped approach
    try {
      if (existsSync(nginxPidPath)) {
        try {
          const pidContent = readFileSync(nginxPidPath, 'utf8').trim();
          if (pidContent) {
            process.kill(parseInt(pidContent), 'SIGQUIT');
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        } catch (pidError) {
          await new Promise((resolve) => {
            exec(`nginx -p ${nginxPrefix} -g 'pid ${nginxPidPath};' -s quit`, () => {
              setTimeout(resolve, 1000);
            });
          });
        }
      }
    } catch (error) {
      // Existing nginx cleanup completed
    }

    // 3. Start nginx with isolated prefix and explicit path overrides
    nginxProcess = spawn("nginx", [
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
      
      // Watchdog - restart services after unexpected nginx exit
      if (code !== 0 && signal !== 'SIGTERM' && signal !== 'SIGQUIT') {
        console.log(`🔄 Attempting full service restart after nginx exit (code: ${code}, signal: ${signal})...`);
        setTimeout(async () => {
          try {
            await stopAllServices();  // Clean shutdown of all services
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 sec
            startNginxAndBackend(); // Restart everything
          } catch (restartError) {
            console.error("❌ Service restart failed:", restartError);
            process.exit(1);
          }
        }, 3000); // 3 second backoff before restart
        return;
      }
      
      if (code !== 0) {
        console.error("❌ Nginx exited with error, shutting down application");
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
      
      // Shutdown all frontend services and brand backend
      if (w3FrontendProcess) {
        console.log("🌐 Stopping W3 Suite Frontend...");
        w3FrontendProcess.kill("SIGTERM");
        w3FrontendProcess = null;
      }
      
      if (brandBackendProcess) {
        console.log("🏭 Stopping Brand Backend...");
        brandBackendProcess.kill("SIGTERM");
        brandBackendProcess = null;
      }
      
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

async function startBackendOnly() {
  const app = express();

  // W3 Suite backend in Pure Backend mode

  // CORS configuration - accept requests from external nginx proxy
  app.use(cors({
    origin: true, // Accept all origins since external nginx handles routing
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-ID', 'X-Demo-User', 'X-Auth-Session']
  }));

  app.use(express.json({ limit: '50mb' })); // Increased to 50MB to support large payloads (price lists, products)

  // Serve static files from public directory
  const publicPath = path.join(__dirname, "../../../../public");
  app.use(express.static(publicPath));

  // Seed dati di riferimento
  await seedCommercialAreas();

  // Crea il server HTTP
  const httpServer = await registerRoutes(app);
  backendServer = httpServer; // Save reference for lifecycle management

  // 🔄 WORKFLOW ASYNC EXECUTION ENGINE - Start BullMQ worker
  try {
    const { isRedisAvailable } = await import('./queue/queue-health.js');
    const redisAvailable = await isRedisAvailable();
    
    if (redisAvailable) {
      startWorkflowWorker();
      console.log('✅ Workflow execution worker started');
    } else {
      console.log('ℹ️  Skipping workflow worker startup (Redis not configured)');
      console.log('🔄 Workflow execution will run synchronously');
      console.log('💡 Set REDIS_URL environment variable to enable async workflow execution');
    }
  } catch (error) {
    console.warn('⚠️  Workflow worker failed to start:', error);
    console.warn('🔄 Workflow execution will run synchronously');
  }

  // Pure backend mode - clean shutdown without frontend processes
  const gracefulShutdown = async () => {
    console.log("🛑 W3 Suite backend shutting down (pure backend mode)");
    await stopWorkflowWorker();
    process.exit(0);
  };

  process.on("SIGTERM", gracefulShutdown);
  process.on("SIGINT", gracefulShutdown);

  // W3 Suite backend on dedicated port (when nginx disabled)
  let backendPort = Number(process.env.W3_BACKEND_PORT || 3004);
  
  // Resilient startup with EADDRINUSE fallback
  const tryListen = (port: number): Promise<void> => {
    return new Promise((resolve, reject) => {
      const server = httpServer.listen(port, "0.0.0.0", () => resolve());
      server.on('error', (err: any) => {
        if (err.code === 'EADDRINUSE') {
          console.log(`⚠️ Port ${port} in use, trying next port...`);
          if (port === 3004) tryListen(3005).then(resolve).catch(reject);
          else if (port === 3005) tryListen(0).then(resolve).catch(reject); // Let system assign port
          else reject(err);
        } else {
          reject(err);
        }
      });
    });
  };

  try {
    await tryListen(backendPort);
    // Get the actual port if system-assigned
    backendPort = (httpServer.address() as any)?.port || backendPort;
    console.log(`🚀 W3 Suite backend running on 0.0.0.0:${backendPort} (pure backend mode)`);
    console.log(`🔌 API available at: http://localhost:${backendPort}/api`);
    console.log(`🔍 Health check: http://localhost:${backendPort}/api/health`);
    console.log(`📡 Ready for external nginx proxy connections`);
    
    // Health check retry loop
    const healthUrl = `http://localhost:${backendPort}/api/health`;
    const maxRetries = 15;
    let retryCount = 0;
    
    const checkHealth = async (): Promise<boolean> => {
      try {
        const response = await fetch(healthUrl);
        if (response.ok) {
          return true;
        }
        return false;
      } catch (error) {
        return false;
      }
    };
    
    while (retryCount < maxRetries) {
      retryCount++;
      const isHealthy = await checkHealth();
      
      if (isHealthy) {
        console.log(`✅ W3 Suite backend started successfully on port ${backendPort}`);
        console.log(`🔌 W3 Suite backend accessible at: http://localhost:${backendPort}`);
        console.log(`🎯 No frontend services will be started (pure backend mode)`);
        break;
      } else {
        console.log(`⏳ W3 Suite backend health check attempt ${retryCount}/${maxRetries} failed, retrying...`);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
      }
    }
    
    if (retryCount >= maxRetries) {
      console.log(`❌ W3 Suite backend health check failed after ${maxRetries} attempts`);
    }
  } catch (error) {
    console.error(`❌ Failed to start backend on port ${backendPort}:`, error);
    process.exit(1);
  }
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
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-ID', 'X-Demo-User', 'X-Auth-Session']
  }));

  app.use(express.json({ limit: '50mb' })); // Increased to 50MB to support large payloads (price lists, products)

  // Serve static files from public directory
  const publicPath = path.join(__dirname, "../../../../public");
  app.use(express.static(publicPath));

  // Seed dati di riferimento
  await seedCommercialAreas();

  // Crea il server HTTP
  const httpServer = await registerRoutes(app);
  backendServer = httpServer; // Save reference for lifecycle management

  // ==================== WEBSOCKET REAL-TIME NOTIFICATIONS ====================
  try {
    const { webSocketService } = await import('./core/websocket-service.js');
    await webSocketService.initialize(httpServer);
    console.log('🌐 WebSocket Service initialized for real-time notifications');
  } catch (error) {
    console.warn('⚠️  WebSocket Service failed to initialize (Redis may not be available):', error);
    console.warn('🔄 Notifications will use database polling fallback');
  }

  // 🔄 WORKFLOW ASYNC EXECUTION ENGINE - Start BullMQ worker
  try {
    const { isRedisAvailable } = await import('./queue/queue-health.js');
    const redisAvailable = await isRedisAvailable();
    
    if (redisAvailable) {
      startWorkflowWorker();
      console.log('✅ Workflow execution worker started');
    } else {
      console.log('ℹ️  Skipping workflow worker startup (Redis not configured)');
      console.log('🔄 Workflow execution will run synchronously');
      console.log('💡 Set REDIS_URL environment variable to enable async workflow execution');
    }
  } catch (error) {
    console.warn('⚠️  Workflow worker failed to start:', error);
    console.warn('🔄 Workflow execution will run synchronously');
  }

  // 🔄 TOKEN REFRESH SERVICE - Automatic OAuth token refresh
  try {
    const { TokenRefreshService } = await import('./services/token-refresh-service.js');
    TokenRefreshService.startMonitoring(15); // Check every 15 minutes
    console.log('✅ Token refresh service started (15 min interval)');
  } catch (error) {
    console.warn('⚠️  Token refresh service failed to start:', error);
  }

  // API-only backend - frontend apps handle their own routing
  // Only serve API, OAuth2, and well-known endpoints

  // W3 Suite backend cleanup - conditionally manage frontend processes
  const gracefulBackendShutdown = async () => {
    console.log("🚫 W3 Suite backend shutting down");
    await stopWorkflowWorker();
    
    // Only manage frontend processes if in embedded nginx mode
    if (ENABLE_EMBEDDED_NGINX) {
      if (w3FrontendProcess) {
        console.log("🌐 Stopping W3 Suite Frontend from backend shutdown...");
        w3FrontendProcess.kill("SIGTERM");
        w3FrontendProcess = null;
      }
      if (brandBackendProcess) {
        console.log("🏭 Stopping Brand Backend from backend shutdown...");
        brandBackendProcess.kill("SIGTERM");
        brandBackendProcess = null;
      }
      if (brandFrontendProcess) {
        console.log("🎨 Stopping Brand Frontend from backend shutdown...");
        brandFrontendProcess.kill("SIGTERM");
        brandFrontendProcess = null;
      }
      if (voiceGatewayProcess) {
        console.log("🎙️ Stopping Voice Gateway from backend shutdown...");
        voiceGatewayProcess.kill("SIGTERM");
        voiceGatewayProcess = null;
      }
    } else {
      console.log("🎯 No frontend processes to stop (pure backend mode)");
    }
    
    process.exit(0);
  };

  process.on("SIGTERM", gracefulBackendShutdown);
  process.on("SIGINT", gracefulBackendShutdown);

  // W3 Suite backend on dedicated port 3004 (internal only)
  const backendPort = parseInt(process.env.W3_BACKEND_PORT || '3004', 10);

  httpServer.listen(backendPort, "127.0.0.1", async () => {
    console.log(`🚀 W3 Suite backend running on localhost:${backendPort} (internal only)`);
    console.log(`🔌 API available internally at: http://localhost:${backendPort}/api`);
    console.log(`🔍 Health check: http://localhost:${backendPort}/api/health`);
    
    // Health check retry loop (like Brand Backend)
    const healthUrl = `http://localhost:${backendPort}/api/health`;
    const maxRetries = 15;
    let retryCount = 0;
    
    const checkHealth = async (): Promise<boolean> => {
      try {
        const response = await fetch(healthUrl);
        if (response.ok) {
          return true;
        }
        return false;
      } catch (error) {
        return false;
      }
    };
    
    while (retryCount < maxRetries) {
      retryCount++;
      const isHealthy = await checkHealth();
      
      if (isHealthy) {
        console.log(`✅ W3 Suite backend started successfully on port ${backendPort}`);
        console.log(`🔌 W3 Suite backend accessible at: http://localhost:${backendPort}`);
        break;
      } else {
        console.log(`⏳ W3 Suite backend health check attempt ${retryCount}/${maxRetries} failed, retrying...`);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
      }
    }
    
    if (retryCount >= maxRetries) {
      console.log(`❌ W3 Suite backend health check failed after ${maxRetries} attempts`);
    }
    
    // Start frontend services only in embedded nginx mode
    if (ENABLE_EMBEDDED_NGINX) {
      console.log("🎯 Starting frontend services (embedded nginx mode)");
      startW3Frontend();
      startBrandBackend();
      startBrandFrontend();
      startVoiceGateway();
    } else {
      console.log("🎯 Skipping frontend services (embedded nginx mode disabled)");
    }
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
          const testReq = exec("curl -s -f http://localhost:3001/brandinterface/", (error, stdout, stderr) => {
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

async function startW3Frontend() {
  console.log("🌐 Starting W3 Suite Frontend on port 3000...");
  
  try {
    const w3FrontendDir = path.resolve(process.cwd(), "apps/frontend/web");
    
    // Verify W3 Suite Frontend directory exists
    if (!existsSync(w3FrontendDir)) {
      throw new Error(`W3 Suite Frontend directory not found: ${w3FrontendDir}`);
    }
    
    // Environment configuration for W3 Suite Frontend
    const w3FrontendEnv = {
      ...process.env,
      HOST: "0.0.0.0",
      PORT: "3000",
      NODE_ENV: "development"
    };
    
    // Spawn W3 Suite Frontend Vite development server using npm run dev
    w3FrontendProcess = spawn("npm", ["run", "dev"], {
      cwd: w3FrontendDir,
      env: w3FrontendEnv,
      stdio: "inherit",
      detached: false
    });
    
    w3FrontendProcess.on("error", (error) => {
      console.error("❌ W3 Suite Frontend process error:", error);
      w3FrontendProcess = null;
    });
    
    w3FrontendProcess.on("exit", (code, signal) => {
      console.log(`🌐 W3 Suite Frontend exited with code ${code}, signal ${signal}`);
      w3FrontendProcess = null;
      
      // Attempt restart on unexpected exit
      if (code !== 0 && signal !== 'SIGTERM' && signal !== 'SIGINT') {
        console.log("🔄 Attempting W3 Suite Frontend restart after unexpected exit...");
        setTimeout(() => {
          startW3Frontend().catch((restartError) => {
            console.error("❌ W3 Suite Frontend restart failed:", restartError);
          });
        }, 3000);
      }
    });
    
    // Health check verification - wait for W3 Suite Frontend to be ready
    console.log("🏥 Waiting for W3 Suite Frontend health check...");
    const maxRetries = 20; // More retries for Vite startup
    let retries = 0;
    
    while (retries < maxRetries) {
      try {
        await new Promise((resolve, reject) => {
          const testReq = exec("curl -s -f http://localhost:3000", (error, stdout, stderr) => {
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
        
        console.log("✅ W3 Suite Frontend started successfully on port 3000");
        console.log("🌐 W3 Suite Frontend accessible at: http://localhost:3000");
        break;
        
      } catch (error) {
        retries++;
        if (retries >= maxRetries) {
          console.error("❌ W3 Suite Frontend health check failed after", maxRetries, "attempts");
          console.log("⚠️ W3 Suite Frontend may still be starting up - continuing...");
          break;
        }
        console.log(`⏳ W3 Suite Frontend health check attempt ${retries}/${maxRetries} failed, retrying...`);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Longer wait for Vite
      }
    }
    
  } catch (error) {
    console.error("❌ Failed to start W3 Suite Frontend:", error);
    console.log("⚠️ Continuing without W3 Suite Frontend...");
  }
}

async function startBrandBackend() {
  console.log("🏭 Starting Brand Backend on port 3002...");
  
  try {
    const brandBackendDir = path.resolve(process.cwd(), "apps/backend/brand-api");
    
    // Verify Brand Backend directory exists
    if (!existsSync(brandBackendDir)) {
      throw new Error(`Brand Backend directory not found: ${brandBackendDir}`);
    }
    
    // Environment configuration for Brand Backend
    const brandBackendEnv = {
      ...process.env,
      BRAND_BACKEND_PORT: "3002",
      NODE_ENV: "development"
    };
    
    // Spawn Brand Backend using tsx to run TypeScript directly
    brandBackendProcess = spawn("tsx", ["src/index.ts"], {
      cwd: brandBackendDir,
      env: brandBackendEnv,
      stdio: "inherit",
      detached: false
    });
    
    brandBackendProcess.on("error", (error) => {
      console.error("❌ Brand Backend process error:", error);
      brandBackendProcess = null;
    });
    
    brandBackendProcess.on("exit", (code, signal) => {
      console.log(`🏭 Brand Backend exited with code ${code}, signal ${signal}`);
      brandBackendProcess = null;
      
      // Attempt restart on unexpected exit
      if (code !== 0 && signal !== 'SIGTERM' && signal !== 'SIGINT') {
        console.log("🔄 Attempting Brand Backend restart after unexpected exit...");
        setTimeout(() => {
          startBrandBackend().catch((restartError) => {
            console.error("❌ Brand Backend restart failed:", restartError);
          });
        }, 3000);
      }
    });
    
    // Health check verification - wait for Brand Backend to be ready
    console.log("🏥 Waiting for Brand Backend health check...");
    const maxRetries = 15;
    let retries = 0;
    
    while (retries < maxRetries) {
      try {
        await new Promise((resolve, reject) => {
          const testReq = exec("curl -s -f http://localhost:3002/brand-api/health", (error, stdout, stderr) => {
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
        
        console.log("✅ Brand Backend started successfully on port 3002");
        console.log("🏭 Brand Backend accessible at: http://localhost:3002");
        break;
        
      } catch (error) {
        retries++;
        if (retries >= maxRetries) {
          console.error("❌ Brand Backend health check failed after", maxRetries, "attempts");
          console.log("⚠️ Brand Backend may still be starting up - continuing...");
          break;
        }
        console.log(`⏳ Brand Backend health check attempt ${retries}/${maxRetries} failed, retrying...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
  } catch (error) {
    console.error("❌ Failed to start Brand Backend:", error);
    console.log("⚠️ Continuing without Brand Backend...");
  }
}

async function startVoiceGateway() {
  console.log("🎙️ Starting W3 Voice Gateway on ports 3005/3105...");
  
  try {
    const voiceGatewayDir = path.resolve(process.cwd(), "apps/voice-gateway");
    
    // Verify Voice Gateway directory exists
    if (!existsSync(voiceGatewayDir)) {
      throw new Error(`Voice Gateway directory not found: ${voiceGatewayDir}`);
    }
    
    // Set environment for Voice Gateway
    const voiceGatewayEnv = {
      ...process.env,
      NODE_ENV: process.env.NODE_ENV || "development",
      VOICE_GATEWAY_PORT: "3005",
      W3_API_URL: "http://localhost:3004"
    };
    
    // Spawn Voice Gateway using tsx to run TypeScript directly
    voiceGatewayProcess = spawn("tsx", ["src/index.ts"], {
      cwd: voiceGatewayDir,
      env: voiceGatewayEnv,
      stdio: "inherit",
      detached: false
    });
    
    voiceGatewayProcess.on("error", (error) => {
      console.error("❌ Voice Gateway process error:", error);
      voiceGatewayProcess = null;
    });
    
    voiceGatewayProcess.on("exit", (code, signal) => {
      voiceGatewayProcess = null;
      if (!isShuttingDown) {
        console.log(`⚠️ Voice Gateway exited with code ${code}, signal ${signal}`);
        // Auto-restart if it crashes (optional)
        console.log("🔄 Attempting Voice Gateway restart after unexpected exit...");
        setTimeout(() => {
          startVoiceGateway().catch((restartError) => {
            console.error("❌ Voice Gateway restart failed:", restartError);
          });
        }, 3000);
      }
    });
    
    // Health check verification - wait for Voice Gateway to be ready
    console.log("🏥 Waiting for Voice Gateway health check...");
    const maxRetries = 15;
    let retries = 0;
    
    while (retries < maxRetries) {
      try {
        await new Promise((resolve, reject) => {
          const testReq = exec("curl -s -f http://localhost:3105/health", (error, stdout, stderr) => {
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
        
        console.log("✅ Voice Gateway started successfully");
        console.log("📡 WebSocket endpoint: ws://localhost:3005");
        console.log("🏥 Health check: http://localhost:3105/health");
        break;
        
      } catch (error) {
        retries++;
        if (retries >= maxRetries) {
          console.error("❌ Voice Gateway health check failed after", maxRetries, "attempts");
          console.log("⚠️ Voice Gateway may still be starting up - continuing...");
          break;
        }
        console.log(`⏳ Voice Gateway health check attempt ${retries}/${maxRetries} failed, retrying...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
  } catch (error) {
    console.error("❌ Failed to start Voice Gateway:", error);
    console.log("⚠️ Continuing without Voice Gateway...");
  }
}