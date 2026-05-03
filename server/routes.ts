import type { Express } from "express";
import { Router } from "express";
import { createServer, type Server } from "http";
import { createCrmEmailRouter } from "./crmEmail";
import { teamAuthRouter } from "./routes/authTeam";
import { authRouter } from "./routes/auth";

export async function registerRoutes(app: Express): Promise<Server> {
  const apiRouter = Router();
  apiRouter.use("/crm", createCrmEmailRouter());
  apiRouter.use("/team", teamAuthRouter);
  apiRouter.use("/auth", authRouter);
  app.use("/api", apiRouter);

  const httpServer = createServer(app);

  return httpServer;
}
