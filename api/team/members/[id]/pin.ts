import type { VercelRequest, VercelResponse } from "@vercel/node";
import { withCors, withMethod, requireCsrf } from "../../../../shared/auth/serverlessHelpers";
import { requireAuth, requireOwnerOrCoOwner } from "../../../../shared/auth/middleware";
import { updateMemberPin } from "../../../../shared/team/members";

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (withCors(req, res)) return;
  if (!withMethod(req, res, "PATCH")) return;
  if (!requireCsrf(req, res)) return;

  const auth = await requireAuth(req, res);
  if (!auth) return;

  const id = req.query.id as string;
  const body = (req.body ?? {}) as { pin?: string; ownerId?: string };
  const { pin, ownerId } = body;

  if (!pin || !ownerId) {
    res.status(400).json({ error: "pin et ownerId requis" });
    return;
  }
  if (!await requireOwnerOrCoOwner(auth.user.id, ownerId, res)) return;

  const result = await updateMemberPin(id, ownerId, pin);
  res.status(result.status).json(result.body);
}
