import "./load-env";
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();

// Faire confiance au proxy (nécessaire pour req.ip correct derrière Vercel/Nginx)
app.set("trust proxy", 1);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// ─── Security headers ─────────────────────────────────────────────────────────
const SUPABASE_HOST = (process.env.VITE_SUPABASE_URL ?? "").replace(/^https?:\/\//, "");

type NodeEnv = "development" | "production";
const NODE_ENV: NodeEnv = process.env.NODE_ENV === "production" ? "production" : "development";

/**
 * Build the Content-Security-Policy header value.
 *
 * In development, Vite injects an inline `<script>` preamble required by
 * `@vitejs/plugin-react` to enable React Fast Refresh. That inline script
 * gets blocked unless `'unsafe-inline'` is whitelisted on `script-src`,
 * which manifests as the runtime error:
 *   "@vitejs/plugin-react can't detect preamble. Something is wrong."
 *
 * In production, Vite emits hashed external bundles only (no inline
 * scripts), so we keep the policy strict — `'self' 'wasm-unsafe-eval'`.
 */
const buildCspPolicy = (env: NodeEnv): string => {
  const scriptSrc =
    env === "development"
      ? "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'"
      : "script-src 'self' 'wasm-unsafe-eval'";
  const connectSrc = `connect-src 'self' https://${SUPABASE_HOST} wss://${SUPABASE_HOST}`;

  return [
    "default-src 'self'",
    scriptSrc,
    // client/index.html charge Inter / Fira Code depuis Google Fonts
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: https:",
    connectSrc,
    "font-src 'self' data: https://fonts.gstatic.com",
    "frame-ancestors 'none'",
  ].join("; ");
};

const CSP_POLICY = buildCspPolicy(NODE_ENV);
log(`[csp] ${CSP_POLICY}`, "server");

app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader("Content-Security-Policy", CSP_POLICY);
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  next();
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "development" || !process.env.NODE_ENV) {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  
  // Ensure port is 5000 if not explicitly set or if invalid
  const finalPort = (isNaN(port) || port <= 0) ? 5000 : port;

  // Use localhost to avoid browser/HMR ping issues with 0.0.0.0
  const host = "127.0.0.1";

  // Build listen options
  const listenOptions: any = {
    port: finalPort,
    host: host,
  };

  // Only enable reusePort on Linux where it's supported
  if (process.platform === "linux") {
    listenOptions.reusePort = true;
  }

  server.on("error", (err: any) => {
    if (err.code === "EADDRINUSE") {
      log(
        `Port ${finalPort} is already in use (often another "npm run dev"). Stop it: macOS "lsof -nP -iTCP:${finalPort} -sTCP:LISTEN" then kill the PID, or change PORT in .env.`,
        "server",
      );
    } else {
      log(`server listen error: ${err?.code || err?.message}`, "server");
    }

    process.exit(1);
  });

  server.listen(listenOptions, () => {
    log(`serving on http://${host}:${finalPort}`);
  });
})();
