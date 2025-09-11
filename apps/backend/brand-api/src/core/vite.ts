import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
import { nanoid } from "nanoid";

// Compute __dirname for ESM
const __dirname = fileURLToPath(new URL('.', import.meta.url));

// Basic vite config for brand-web
const brandViteConfig = {
  plugins: [],
  resolve: {
    alias: {
      "@": "/src",
    },
  },
};

const viteLogger = createLogger();

export function brandLog(message: string, source = "brand-express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit", 
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export async function setupBrandVite(app: Express, server: Server) {
  console.log("🎨 Setting up Brand Interface Vite server...");

  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...brandViteConfig,
    configFile: false,
    root: path.resolve(__dirname, "..", "..", "..", "..", "..", "apps", "frontend", "brand-web"),
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(`[Brand Interface Vite Error] ${msg}`, options);
        // Non terminare il processo per errori Vite in development
      },
    },
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    // Skip Brand API routes - let them be handled by the Brand API router
    if (url.startsWith('/brand-api/')) {
      return next();
    }

    try {
      const brandTemplate = path.resolve(
        __dirname,
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

      // always reload the index.html file from disk in case it changes
      let template = await fs.promises.readFile(brandTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });

  console.log("✅ Brand Interface Vite setup completed");
}