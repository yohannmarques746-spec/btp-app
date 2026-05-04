import type { VercelRequest, VercelResponse } from "@vercel/node";
import { withCors, withMethod, extractBearer, requireCsrf } from "../../shared/auth/serverlessHelpers";
import { logoutMember } from "../../shared/team/auth";

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (withCors(req, res)) return;
  if (!withMethod(req, res, "POST")) return;
  if (!requireCsrf(req, res)) return;

  const token = extractBearer(req);
  if (!token) {
    res.status(401).json({ error: "Token manquant" });
    return;
  }

  const result = await logoutMember(token);
  res.status(result.status).json(result.body);
}
