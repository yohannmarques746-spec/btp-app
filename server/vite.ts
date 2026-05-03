import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import {
  createServer as createViteServer,
  createLogger,
  mergeConfig,
} from "vite";
import { type Server } from "http";
import viteConfig from "../vite.config";
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
  const rawPort = parseInt(process.env.PORT || "5000", 10);
  const devPort = Number.isNaN(rawPort) || rawPort <= 0 ? 5000 : rawPort;

  const serverOptions = {
    middlewareMode: true,
    hmr: {
      server,
      host: "127.0.0.1",
      port: devPort,
      clientPort: devPort,
    },
    allowedHosts: true as const,
  };

  const repoRoot = path.resolve(import.meta.dirname, "..");

  const vite = await createViteServer(
    mergeConfig(viteConfig, {
      configFile: false,
      envDir: repoRoot,
      customLogger: {
        ...viteLogger,
        error: (msg: string, options?: { error?: Error }) => {
          viteLogger.error(msg, options);
          process.exit(1);
        },
      },
      server: {
        ...viteConfig.server,
        ...serverOptions,
      },
      appType: "custom",
    }),
  );

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    // #region agent log
    fetch("http://127.0.0.1:7471/ingest/9f4619ca-3c4c-4985-8121-3b0a2609e4da", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "a13edd",
      },
      body: JSON.stringify({
        sessionId: "a13edd",
        runId: "run-1",
        hypothesisId: "H1",
        location: "server/vite.ts:catch-all-entry",
        message: "Vite catch-all request",
        data: { url },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html",
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`,
      );
      const page = await vite.transformIndexHtml(url, template);
      const hasReactRefreshRuntime =
        page.includes("/@react-refresh") || page.includes("react-refresh");
      const hasPreambleMarker = page.includes("__vite_plugin_react_preamble_installed__");
      // #region agent log
      fetch("http://127.0.0.1:7471/ingest/9f4619ca-3c4c-4985-8121-3b0a2609e4da", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Debug-Session-Id": "a13edd",
        },
        body: JSON.stringify({
          sessionId: "a13edd",
          runId: "run-1",
          hypothesisId: "H2",
          location: "server/vite.ts:after-transformIndexHtml",
          message: "Transformed HTML preamble diagnostics",
          data: { url, hasReactRefreshRuntime, hasPreambleMarker },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(import.meta.dirname, "..", "dist", "public");

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
