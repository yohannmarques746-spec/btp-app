import type { VercelRequest, VercelResponse } from "@vercel/node";
import { withCors, withMethod, requireCsrf, requireRateLimit } from "../../shared/auth/serverlessHelpers";
import { loginPin } from "../../shared/team/auth";

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (withCors(req, res)) return;
  if (!withMethod(req, res, "POST")) return;
  if (!requireCsrf(req, res)) return;

  const body = (req.body ?? {}) as { pin?: string; ownerId?: string };
  const { pin, ownerId } = body;

  if (!pin || !ownerId) {
    res.status(400).json({ error: "PIN et ownerId requis" });
    return;
  }

  if (!requireRateLimit(req, res, ownerId)) return;

  const result = await loginPin(pin, ownerId);
  res.status(result.status).json(result.body);
}
