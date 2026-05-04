import { Router, type Request, type Response } from "express";
import { supabaseServer } from "../supabaseServer";
import { generateCsrfToken, csrfMiddleware } from "../middleware/csrf";
import { rateLimitLoginMember } from "../middleware/rateLimit";
import { loginPin, loginInvite, logoutMember, getMemberSession } from "@shared/team/auth";
import { listMembers, getMember, createMember, updateMemberPin, confirmMember, refuseMember, updatePermissions, updateStatus, deleteMember, setOwnPin } from "@shared/team/members";
import { listNotes, createNote } from "@shared/team/notes";
import { listCoOwners, addCoOwner, removeCoOwner } from "@shared/team/coOwners";

const router = Router();

async function getSupabaseUser(req: Request) {
  const auth = req.headers.authorization;
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return null;
  const { data: { user }, error } = await supabaseServer.auth.getUser(token);
  if (error || !user) return null;
  return user;
}

function extractBearer(req: Request): string | null {
  const auth = req.headers.authorization;
  return auth?.startsWith("Bearer ") ? auth.slice(7) : null;
}

async function isOwnerOrCoOwner(userId: string, ownerId: string): Promise<boolean> {
  if (userId === ownerId) return true;
  const { data } = await supabaseServer.rpc("is_co_owner", { p_owner_id: ownerId, p_user_id: userId });
  return !!data;
}

// ─── GET /api/team/csrf-token ─────────────────────────────────────────────────
router.get("/csrf-token", (_req: Request, res: Response) => {
  res.json({ token: generateCsrfToken() });
});

router.use(csrfMiddleware);

// ─── POST /api/team/login-pin (+ alias /login) ────────────────────────────────
async function handleLoginPin(req: Request, res: Response): Promise<void> {
  const { pin, ownerId } = req.body as { pin?: string; ownerId?: string };
  if (!pin || !ownerId) { res.status(400).json({ error: "PIN et ownerId requis" }); return; }
  const result = await loginPin(pin, ownerId);
  res.status(result.status).json(result.body);
}
router.post("/login-pin", rateLimitLoginMember, handleLoginPin);
router.post("/login", rateLimitLoginMember, handleLoginPin);

// ─── POST /api/team/login-invite ──────────────────────────────────────────────
router.post("/login-invite", rateLimitLoginMember, async (req: Request, res: Response): Promise<void> => {
  const { token, pin } = req.body as { token?: string; pin?: string };
  if (!token || !pin) { res.status(400).json({ error: "token et pin requis" }); return; }
  const result = await loginInvite(token, pin);
  res.status(result.status).json(result.body);
});

// ─── POST /api/team/logout ────────────────────────────────────────────────────
router.post("/logout", async (req: Request, res: Response): Promise<void> => {
  const token = extractBearer(req);
  if (!token) { res.status(401).json({ error: "Token manquant" }); return; }
  const result = await logoutMember(token);
  res.status(result.status).json(result.body);
});

// ─── GET /api/team/me + /api/team/session ─────────────────────────────────────
async function handleGetSession(req: Request, res: Response): Promise<void> {
  const token = extractBearer(req);
  if (!token) { res.status(401).json({ error: "Token manquant" }); return; }
  const result = await getMemberSession(token);
  res.status(result.status).json(result.body);
}
router.get("/me", handleGetSession);
router.get("/session", handleGetSession);

// ─── GET /api/team/notes + POST /api/team/notes ───────────────────────────────
router.get("/notes", async (req: Request, res: Response): Promise<void> => {
  const token = extractBearer(req);
  if (!token) { res.status(401).json({ error: "Token manquant" }); return; }
  const result = await listNotes(token);
  res.status(result.status).json(result.body);
});
router.post("/notes", async (req: Request, res: Response): Promise<void> => {
  const token = extractBearer(req);
  if (!token) { res.status(401).json({ error: "Token manquant" }); return; }
  const { chantierId, content } = req.body as { chantierId?: string; content?: string };
  if (!chantierId || !content?.trim()) { res.status(400).json({ error: "chantierId et content requis" }); return; }
  const result = await createNote(token, chantierId, content.trim());
  res.status(result.status).json(result.body);
});

// ─── /api/team/co-owners ─────────────────────────────────────────────────────
router.get("/co-owners", async (req: Request, res: Response): Promise<void> => {
  const user = await getSupabaseUser(req);
  if (!user) { res.status(401).json({ error: "Non autorisé" }); return; }
  const { ownerId } = req.query as { ownerId?: string };
  if (!ownerId) { res.status(400).json({ error: "ownerId requis" }); return; }
  if (!await isOwnerOrCoOwner(user.id, ownerId)) { res.status(403).json({ error: "Accès refusé" }); return; }
  const result = await listCoOwners(ownerId);
  res.status(result.status).json(result.body);
});
router.post("/co-owners", async (req: Request, res: Response): Promise<void> => {
  const user = await getSupabaseUser(req);
  if (!user) { res.status(401).json({ error: "Non autorisé" }); return; }
  const { email, ownerId } = req.body as { email?: string; ownerId?: string };
  if (!email?.trim() || !ownerId) { res.status(400).json({ error: "Email et ownerId requis" }); return; }
  if (!await isOwnerOrCoOwner(user.id, ownerId)) { res.status(403).json({ error: "Accès refusé" }); return; }
  const result = await addCoOwner(ownerId, email, user.email ?? "");
  res.status(result.status).json(result.body);
});
router.delete("/co-owners/:userId", async (req: Request, res: Response): Promise<void> => {
  const user = await getSupabaseUser(req);
  if (!user) { res.status(401).json({ error: "Non autorisé" }); return; }
  const { ownerId } = req.body as { ownerId?: string };
  if (!ownerId) { res.status(400).json({ error: "ownerId requis" }); return; }
  if (!await isOwnerOrCoOwner(user.id, ownerId)) { res.status(403).json({ error: "Accès refusé" }); return; }
  const result = await removeCoOwner(ownerId, req.params.userId);
  res.status(result.status).json(result.body);
});

// ─── /api/team/members ────────────────────────────────────────────────────────
router.get("/members", async (req: Request, res: Response): Promise<void> => {
  const user = await getSupabaseUser(req);
  if (!user) { res.status(401).json({ error: "Non autorisé" }); return; }
  const { ownerId, status } = req.query as { ownerId?: string; status?: string };
  if (!ownerId) { res.status(400).json({ error: "ownerId requis" }); return; }
  if (!await isOwnerOrCoOwner(user.id, ownerId)) { res.status(403).json({ error: "Accès refusé" }); return; }
  const result = await listMembers(ownerId, status);
  res.status(result.status).json(result.body);
});
router.post("/members", async (req: Request, res: Response): Promise<void> => {
  const user = await getSupabaseUser(req);
  if (!user) { res.status(401).json({ error: "Non autorisé" }); return; }
  const { name, pin, role, ownerId } = req.body as { name?: string; pin?: string; role?: string; ownerId?: string };
  if (!name || !pin || !ownerId) { res.status(400).json({ error: "name, pin et ownerId requis" }); return; }
  if (!await isOwnerOrCoOwner(user.id, ownerId)) { res.status(403).json({ error: "Accès refusé" }); return; }
  const result = await createMember(ownerId, name, pin, role ?? "member");
  res.status(result.status).json(result.body);
});

// ─── POST /api/team/members/me/set-pin (AVANT :id pour éviter conflit) ────────
router.post("/members/me/set-pin", async (req: Request, res: Response): Promise<void> => {
  const memberToken = extractBearer(req);
  if (!memberToken) { res.status(401).json({ error: "Token manquant" }); return; }
  const { pin, oldPin } = req.body as { pin?: string; oldPin?: string };
  if (!pin) { res.status(400).json({ error: "PIN invalide — 6 chiffres requis" }); return; }
  const result = await setOwnPin(memberToken, pin, oldPin ?? null);
  res.status(result.status).json(result.body);
});

// ─── /api/team/members/:id ───────────────────────────────────────────────────
router.get("/members/:id", async (req: Request, res: Response): Promise<void> => {
  const user = await getSupabaseUser(req);
  if (!user) { res.status(401).json({ error: "Non autorisé" }); return; }
  const { ownerId } = req.query as { ownerId?: string };
  if (!ownerId) { res.status(400).json({ error: "ownerId requis" }); return; }
  const isOwner = user.id === ownerId;
  if (!await isOwnerOrCoOwner(user.id, ownerId)) { res.status(403).json({ error: "Accès refusé" }); return; }
  const result = await getMember(req.params.id, ownerId, isOwner);
  res.status(result.status).json(result.body);
});
router.post("/members/:id/confirm", async (req: Request, res: Response): Promise<void> => {
  const user = await getSupabaseUser(req);
  if (!user) { res.status(401).json({ error: "Non autorisé" }); return; }
  const { ownerId, role, pin } = req.body as { ownerId?: string; role?: string; pin?: string };
  if (!ownerId || !role) { res.status(400).json({ error: "ownerId et role requis" }); return; }
  if (!await isOwnerOrCoOwner(user.id, ownerId)) { res.status(403).json({ error: "Accès refusé" }); return; }
  const result = await confirmMember(req.params.id, ownerId, role, pin ?? null);
  res.status(result.status).json(result.body);
});
router.post("/members/:id/refuse", async (req: Request, res: Response): Promise<void> => {
  const user = await getSupabaseUser(req);
  if (!user) { res.status(401).json({ error: "Non autorisé" }); return; }
  const { ownerId } = req.body as { ownerId?: string };
  if (!ownerId) { res.status(400).json({ error: "ownerId requis" }); return; }
  if (!await isOwnerOrCoOwner(user.id, ownerId)) { res.status(403).json({ error: "Accès refusé" }); return; }
  const result = await refuseMember(req.params.id, ownerId);
  res.status(result.status).json(result.body);
});
router.patch("/members/:id/pin", async (req: Request, res: Response): Promise<void> => {
  const user = await getSupabaseUser(req);
  if (!user) { res.status(401).json({ error: "Non autorisé" }); return; }
  const { pin, ownerId } = req.body as { pin?: string; ownerId?: string };
  if (!pin || !ownerId) { res.status(400).json({ error: "pin et ownerId requis" }); return; }
  if (!await isOwnerOrCoOwner(user.id, ownerId)) { res.status(403).json({ error: "Accès refusé" }); return; }
  const result = await updateMemberPin(req.params.id, ownerId, pin);
  res.status(result.status).json(result.body);
});
router.patch("/members/:id/permissions", async (req: Request, res: Response): Promise<void> => {
  const user = await getSupabaseUser(req);
  if (!user) { res.status(401).json({ error: "Non autorisé" }); return; }
  const { ownerId, permissions } = req.body as { ownerId?: string; permissions?: object };
  if (!ownerId || !permissions) { res.status(400).json({ error: "ownerId et permissions requis" }); return; }
  const isOwner = user.id === ownerId;
  if (!await isOwnerOrCoOwner(user.id, ownerId)) { res.status(403).json({ error: "Accès refusé" }); return; }
  const result = await updatePermissions(req.params.id, ownerId, permissions, isOwner);
  res.status(result.status).json(result.body);
});
router.patch("/members/:id/status", async (req: Request, res: Response): Promise<void> => {
  const user = await getSupabaseUser(req);
  if (!user) { res.status(401).json({ error: "Non autorisé" }); return; }
  const { ownerId, status } = req.body as { ownerId?: string; status?: string };
  if (!ownerId || !status) { res.status(400).json({ error: "ownerId et status requis" }); return; }
  const isOwner = user.id === ownerId;
  if (!await isOwnerOrCoOwner(user.id, ownerId)) { res.status(403).json({ error: "Accès refusé" }); return; }
  const result = await updateStatus(req.params.id, ownerId, status, isOwner);
  res.status(result.status).json(result.body);
});
router.delete("/members/:id", async (req: Request, res: Response): Promise<void> => {
  const user = await getSupabaseUser(req);
  if (!user) { res.status(401).json({ error: "Non autorisé" }); return; }
  const { ownerId } = req.body as { ownerId?: string };
  if (!ownerId) { res.status(400).json({ error: "ownerId requis" }); return; }
  if (user.id !== ownerId) { res.status(403).json({ error: "Seul le patron peut supprimer définitivement" }); return; }
  const result = await deleteMember(req.params.id, ownerId);
  res.status(result.status).json(result.body);
});

export const teamAuthRouter = router;
