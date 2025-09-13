import express from "express";
import cors from "cors";
import { registerBrandRoutes } from "./core/routes.js";

console.log("🚀 Starting Brand API Server...");

// Error handling per mantenere il processo attivo in development
process.on('uncaughtException', (error) => {
  console.error('❌ Brand API uncaught exception:', error);
  if (process.env.NODE_ENV !== 'development') {
    process.exit(1);
  }
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Brand API unhandled rejection at:', promise, 'reason:', reason);
  if (process.env.NODE_ENV !== 'development') {
    process.exit(1);
  }
});

try {
  const app = express();
  
  // CORS configuration for Brand API - Allow Frontend (3001) and Reverse Proxy (5000)
  app.use(cors({
    origin: ['http://localhost:3001', 'http://localhost:5000', 'http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }));
  
  app.use(express.json());

  // Crea il server HTTP per Brand API
  const httpServer = await registerBrandRoutes(app);

  // Event handlers per il server HTTP
  httpServer.on('error', (error) => {
    console.error('❌ Brand API server error:', error);
  });

  httpServer.on('close', () => {
    console.log('🚫 Brand API server closed');
  });

  // Trova una porta libera per il Brand Backend
  const preferredPort = parseInt(process.env.BRAND_BACKEND_PORT || '3002', 10);
  const alternativePorts = [3002, 3008, 3009, 3010];
  
  let port = preferredPort;
  
  // Check if preferred port is available, otherwise try alternatives
  const net = await import('net');
  
  const checkPort = (portToCheck: number): Promise<boolean> => {
    return new Promise((resolve) => {
      const server = net.createServer();
      server.listen(portToCheck, () => {
        server.once('close', () => resolve(true));
        server.close();
      });
      server.on('error', () => resolve(false));
    });
  };
  
  for (const tryPort of alternativePorts) {
    const isAvailable = await checkPort(tryPort);
    if (isAvailable) {
      port = tryPort;
      console.log(`✅ Using port ${port} for Brand Backend`);
      break;
    }
  }
  
  httpServer.listen(port, "0.0.0.0", () => {
    console.log(`✅ Brand API server running on port ${port}`);
    console.log(`🔌 Brand API available at: http://localhost:${port}/brand-api/health`);
  });

  httpServer.on('error', (error: any) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`❌ Port ${port} is already in use. Please free the port and restart.`);
      console.error('💡 Try: pkill -f "tsx" && ./start-enterprise.sh');
    } else {
      console.error('❌ Brand API server error:', error);
    }
    if (process.env.NODE_ENV !== 'development') {
      process.exit(1);
    }
  });

} catch (error) {
  console.error('❌ Brand API startup failed:', error);
  if (process.env.NODE_ENV !== 'development') {
    process.exit(1);
  }
}

