import type { VercelRequest, VercelResponse } from "@vercel/node";
import { withCors, withMethod, extractBearer } from "../../shared/auth/serverlessHelpers";
import { getMemberSession } from "../../shared/team/auth";

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (withCors(req, res)) return;
  if (!withMethod(req, res, "GET")) return;

  const token = extractBearer(req);
  if (!token) {
    res.status(401).json({ error: "Token manquant" });
    return;
  }

  const result = await getMemberSession(token);
  res.status(result.status).json(result.body);
}
