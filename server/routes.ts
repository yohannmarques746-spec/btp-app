import type { Express } from "express";
import { Router } from "express";
import { createServer, type Server } from "http";
import { createCrmEmailRouter } from "./crmEmail";
import { teamMemberAuthRouter } from "./teamMemberAuth";

export async function registerRoutes(app: Express): Promise<Server> {
  const apiRouter = Router();
  apiRouter.use("/crm", createCrmEmailRouter());
  apiRouter.use("/team", teamMemberAuthRouter);
  app.use("/api", apiRouter);

  const httpServer = createServer(app);

  return httpServer;
}
