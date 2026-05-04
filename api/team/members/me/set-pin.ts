import type { VercelRequest, VercelResponse } from "@vercel/node";
import { withCors, withMethod, extractBearer, requireCsrf } from "../../../../shared/auth/serverlessHelpers";
import { setOwnPin } from "../../../../shared/team/members";

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (withCors(req, res)) return;
  if (!withMethod(req, res, "POST")) return;
  if (!requireCsrf(req, res)) return;

  const memberToken = extractBearer(req);
  if (!memberToken) {
    res.status(401).json({ error: "Token manquant" });
    return;
  }

  const body = (req.body ?? {}) as { pin?: string; oldPin?: string };
  const { pin, oldPin } = body;

  if (!pin) {
    res.status(400).json({ error: "PIN invalide — 6 chiffres requis" });
    return;
  }

  const result = await setOwnPin(memberToken, pin, oldPin ?? null);
  res.status(result.status).json(result.body);
}
