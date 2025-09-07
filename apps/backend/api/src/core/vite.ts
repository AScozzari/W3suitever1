import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
import viteConfig from "../../../../../apps/frontend/web/vite.config";
import brandViteConfig from "../../../../../apps/frontend/brand-web/vite.config";
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

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
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

  // Setup Brand Interface routes
  const brandVite = await createViteServer({
    ...brandViteConfig,
    configFile: false,
    root: path.resolve(import.meta.dirname, "..", "..", "..", "..", "..", "apps", "frontend", "brand-web"),
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    server: {
      ...serverOptions,
      port: undefined, // Don't conflict with main server
    },
    appType: "custom",
  });

  // Brand Interface middleware for /brandinterface path
  app.use("/brandinterface", brandVite.middlewares);
  app.use("/brandinterface*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const brandTemplate = path.resolve(
        import.meta.dirname,
        "..",
        "..",
        "..",
        "..",
        "..",
        "apps",
        "frontend",
        "brand-web",
        "index.html",
      );

      let template = await fs.promises.readFile(brandTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`,
      );
      const page = await brandVite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      brandVite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });

  // Main W3 Suite middleware  
  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    // Skip API routes - let them be handled by the API router
    if (url.startsWith('/api/')) {
      return next();
    }

    // Skip Brand Interface routes
    if (url.startsWith('/brandinterface')) {
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
