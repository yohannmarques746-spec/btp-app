import type { VercelRequest, VercelResponse } from "@vercel/node";
import { withCors, withMethod, requireCsrf, requireRateLimit } from "../../shared/auth/serverlessHelpers";
import { loginInvite } from "../../shared/team/auth";

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (withCors(req, res)) return;
  if (!withMethod(req, res, "POST")) return;
  if (!requireCsrf(req, res)) return;

  const body = (req.body ?? {}) as { token?: string; pin?: string };
  const { token, pin } = body;

  if (!token || !pin) {
    res.status(400).json({ error: "token et pin requis" });
    return;
  }

  if (!requireRateLimit(req, res, "invite")) return;

  const result = await loginInvite(token, pin);
  res.status(result.status).json(result.body);
}
