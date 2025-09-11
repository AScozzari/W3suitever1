import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
import viteConfig from "../../../../../apps/frontend/web/vite.config";
import { nanoid } from "nanoid";

const viteLogger = createLogger();

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export async function setupBrandInterfaceVite(app: Express, server: Server) {
  console.log("🚀 Setting up Brand Interface Vite middleware...");
  
  const brandWebPath = path.resolve(import.meta.dirname, "..", "..", "..", "..", "..", "apps", "frontend", "brand-web");
  
  const brandVite = await createViteServer({
    configFile: path.join(brandWebPath, "vite.config.ts"), // USA il config di Brand Web
    root: brandWebPath,
    base: '/brandinterface/',
    server: { 
      middlewareMode: true,
      hmr: { server }
    },
    appType: "spa",
    customLogger: {
      ...viteLogger,
      info: (msg) => console.log(`🔶 [Brand Vite] ${msg}`),
      error: (msg, options) => {
        console.error(`❌ [Brand Vite] ${msg}`);
        viteLogger.error(msg, options);
      },
    }
    // Plugins e resolve vengono caricati automaticamente dal config file
  });
  
  // PRIMO: Vite middlewares per asset, HMR, @vite/client, etc.
  app.use('/brandinterface', brandVite.middlewares);
  
  // SECONDO: Catch-all RISTRETTO solo per richieste HTML document
  app.use('/brandinterface', async (req, res, next) => {
    // Solo richieste GET che accettano HTML
    if (req.method !== 'GET') return next();
    
    const accept = req.headers.accept || '';
    const isHtmlRequest = accept.includes('text/html');
    
    // Skip assets: path con punto, @vite paths, src paths
    const isAsset = req.path.includes('.') || 
                   req.path.startsWith('/@') || 
                   req.path.startsWith('/src/') ||
                   req.originalUrl.includes('/brandinterface/@') ||
                   req.originalUrl.includes('/brandinterface/src/');
    
    // Solo HTML document requests, non assets
    if (!isHtmlRequest || isAsset) {
      console.log(`🔄 [Brand Vite] Skip HTML for: ${req.originalUrl} (asset=${isAsset}, html=${isHtmlRequest})`);
      return next();
    }
    
    try {
      console.log(`📄 [Brand Vite] Serving HTML for: ${req.originalUrl}`);
      const url = req.originalUrl.replace(/^\/brandinterface/, '') || '/';
      const tplPath = path.join(brandWebPath, 'index.html');
      let tpl = await fs.promises.readFile(tplPath, 'utf-8');
      const html = await brandVite.transformIndexHtml(url, tpl);
      res.status(200).set({ 'Content-Type': 'text/html' }).end(html);
    } catch (e) {
      console.error(`❌ [Brand Vite] HTML transform error:`, e);
      brandVite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
  
  console.log("✅ Brand Interface Vite middleware mounted at /brandinterface");
  console.log("✅ Brand Interface HTML transform handler added");
  
  return brandVite;
}

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
    proxy: {} // DISABILITA proxy di Vite in middleware mode per evitare loop
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    root: path.resolve(import.meta.dirname, "..", "..", "..", "..", "..", "apps", "frontend", "web"),
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    server: serverOptions,
    appType: "custom",
  });

  // GUARDIA: Impedisce a Vite middleware di toccare i path Brand Interface
  app.use((req, res, next) => {
    if (req.path.startsWith('/brandinterface') || req.path.startsWith('/brand-api')) {
      return next(); // Salta completamente Vite middleware
    }
    return vite.middlewares(req, res, next);
  });
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    // Skip API routes - let them be handled by the API router
    if (url.startsWith('/api/')) {
      return next();
    }
    
    // Skip Brand Interface routes - they're handled by proxy
    if (url.startsWith('/brandinterface') || url.startsWith('/brand-api')) {
      return next();
    }

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "..",
        "..",
        "..",
        "..",
        "..",
        "apps",
        "frontend",
        "web",
        "index.html",
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`,
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(import.meta.dirname, "public");

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
