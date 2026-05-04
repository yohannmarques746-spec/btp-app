import type { VercelRequest, VercelResponse } from "@vercel/node";
import { withCors, withMethod, requireCsrf } from "../../../shared/auth/serverlessHelpers";
import { requireAuth, requireOwnerOrCoOwner } from "../../../shared/auth/middleware";
import { listMembers, createMember } from "../../../shared/team/members";

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (withCors(req, res)) return;
  if (!withMethod(req, res, ["GET", "POST"])) return;

  const auth = await requireAuth(req, res);
  if (!auth) return;

  if (req.method === "GET") {
    const ownerId = req.query.ownerId as string | undefined;
    const status = req.query.status as string | undefined;

    if (!ownerId) {
      res.status(400).json({ error: "ownerId requis" });
      return;
    }
    if (!await requireOwnerOrCoOwner(auth.user.id, ownerId, res)) return;

    const result = await listMembers(ownerId, status);
    res.status(result.status).json(result.body);
    return;
  }

  if (!requireCsrf(req, res)) return;

  const body = (req.body ?? {}) as { name?: string; pin?: string; role?: string; ownerId?: string };
  const { name, pin, role, ownerId } = body;

  if (!name || !pin || !ownerId) {
    res.status(400).json({ error: "name, pin et ownerId requis" });
    return;
  }
  if (!await requireOwnerOrCoOwner(auth.user.id, ownerId, res)) return;

  const result = await createMember(ownerId, name, pin, role ?? "member");
  res.status(result.status).json(result.body);
}
