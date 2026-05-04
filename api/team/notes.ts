import type { VercelRequest, VercelResponse } from "@vercel/node";
import { withCors, withMethod, extractBearer, requireCsrf } from "../../shared/auth/serverlessHelpers";
import { listNotes, createNote } from "../../shared/team/notes";

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (withCors(req, res)) return;
  if (!withMethod(req, res, ["GET", "POST"])) return;

  const token = extractBearer(req);
  if (!token) {
    res.status(401).json({ error: "Token manquant" });
    return;
  }

  if (req.method === "GET") {
    const result = await listNotes(token);
    res.status(result.status).json(result.body);
    return;
  }

  if (!requireCsrf(req, res)) return;

  const body = (req.body ?? {}) as { chantierId?: string; content?: string };
  const { chantierId, content } = body;

  if (!chantierId || !content?.trim()) {
    res.status(400).json({ error: "chantierId et content requis" });
    return;
  }

  const result = await createNote(token, chantierId, content.trim());
  res.status(result.status).json(result.body);
}
