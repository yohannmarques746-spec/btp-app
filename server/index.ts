import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

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

  // Handle server errors gracefully
  server.on("error", (err: any) => {
    if (err.code === "EADDRINUSE") {
      log(`Port ${finalPort} is already in use`, "server");
    } else {
      log(`server listen error: ${err?.code || err?.message}`, "server");
    }

    process.exit(1);
  });

  server.listen(listenOptions, () => {
    log(`serving on http://${host}:${finalPort}`);
  });
})();
