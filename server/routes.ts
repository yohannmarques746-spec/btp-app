import type { Express } from "express";
import { Router } from "express";
import { createServer, type Server } from "http";
import { createCrmEmailRouter } from "./crmEmail";
import { teamAuthRouter } from "./routes/authTeam";

export async function registerRoutes(app: Express): Promise<Server> {
  const apiRouter = Router();
  apiRouter.use("/crm", createCrmEmailRouter());
  apiRouter.use("/team", teamAuthRouter);
  app.use("/api", apiRouter);

  const httpServer = createServer(app);

  return httpServer;
}
