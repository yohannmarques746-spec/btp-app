import type { Express } from "express";
import { Router } from "express";
import { createServer, type Server } from "http";
import { createCrmEmailRouter } from "./crmEmail";

export async function registerRoutes(app: Express): Promise<Server> {
  const apiRouter = Router();
  apiRouter.use("/crm", createCrmEmailRouter());
  app.use("/api", apiRouter);

  const httpServer = createServer(app);

  return httpServer;
}
