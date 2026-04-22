import { Router, type Request, type Response } from "express";
import { supabaseServer } from "./supabaseServer";

const router = Router();

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PIN_RE = /^\d{4}$/;
function isValidPin(pin: string): boolean { return PIN_RE.test(pin); }

function extractBearer(req: Request): string | null {
  const auth = req.headers.authorization;
  return auth?.startsWith("Bearer ") ? auth.slice(7) : null;
}

function unwrapRpc<T>(data: T | T[] | null): T | null {
  if (!data) return null;
  if (Array.isArray(data)) return data.length > 0 ? data[0] : null;
  return data;
}

async function getSupabaseUser(req: Request) {
  const token = extractBearer(req);
  if (!token) return null;
  const { data: { user }, error } = await supabaseServer.auth.getUser(token);
  if (error || !user) return null;
  return user;
}

// ─── Rate limiter ─────────────────────────────────────────────────────────────
const loginAttempts = new Map<string, { count: number; resetAt: number }>();

setInterval(() => {
  const now = Date.now();
  loginAttempts.forEach((entry, ip) => {
    if (entry.resetAt < now) loginAttempts.delete(ip);
  });
}, 15 * 60 * 1000);

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = loginAttempts.get(ip);
  if (!entry || entry.resetAt < now) {
    loginAttempts.set(ip, { count: 1, resetAt: now + 10 * 60 * 1000 });
    return true;
  }
  if (entry.count >= 5) return false;
  entry.count++;
  return true;
}

// ─── POST /api/team/login ─────────────────────────────────────────────────────
router.post("/login", async (req: Request, res: Response) => {
  const ip = req.ip ?? req.socket?.remoteAddress ?? "unknown";
  if (!checkRateLimit(ip)) {
    return res.status(429).json({ error: "Trop de tentatives. Réessayez dans 10 minutes." });
  }

  const { pin, ownerId } = req.body as { pin?: string; ownerId?: string };
  if (!pin || !ownerId) return res.status(400).json({ error: "PIN et ownerId requis" });
  if (!isValidPin(pin)) return res.status(401).json({ error: "Code incorrect" });

  try {
    const { data, error } = await supabaseServer.rpc("login_member_pin", {
      input_pin: pin,
      p_owner_id: ownerId,
    });
    if (error) { console.error("[team/login] RPC error:", error); return res.status(500).json({ error: "Erreur serveur" }); }
    const row = unwrapRpc(data);
    if (!row) return res.status(401).json({ error: "Code incorrect ou compte inactif" });
    return res.json({ token: row.session_token, memberId: row.member_id, name: row.member_name });
  } catch (err) {
    console.error("[team/login]", err);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

// ─── POST /api/team/logout ────────────────────────────────────────────────────
router.post("/logout", async (req: Request, res: Response) => {
  const token = extractBearer(req);
  if (!token) return res.status(401).json({ error: "Token manquant" });
  try {
    await supabaseServer.rpc("logout_member", { p_token: token });
    return res.json({ ok: true });
  } catch (err) {
    console.error("[team/logout]", err);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

// ─── GET /api/team/me ─────────────────────────────────────────────────────────
router.get("/me", async (req: Request, res: Response) => {
  const token = extractBearer(req);
  if (!token) return res.status(401).json({ error: "Token manquant" });

  try {
    const { data, error } = await supabaseServer.rpc("get_member_session", { p_token: token });
    if (error) { console.error("[team/me] RPC error:", error); return res.status(500).json({ error: "Erreur serveur" }); }
    const row = unwrapRpc(data);
    if (!row) return res.status(401).json({ error: "Session expirée ou invalide" });

    return res.json({
      memberId: row.member_id,
      name: row.member_name,
      permissions: row.member_permissions,
      ownerId: row.owner_id,
      assignedChantiers: row.chantiers ?? [],
    });
  } catch (err) {
    console.error("[team/me]", err);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

// ─── POST /api/team/members ───────────────────────────────────────────────────
router.post("/members", async (req: Request, res: Response) => {
  const user = await getSupabaseUser(req);
  if (!user) return res.status(401).json({ error: "Non autorisé" });

  const { name, pin, role, ownerId } = req.body as {
    name?: string; pin?: string; role?: string; ownerId?: string;
  };
  if (!name || !pin || !ownerId) return res.status(400).json({ error: "name, pin et ownerId requis" });
  if (user.id !== ownerId) {
    const { data } = await supabaseServer.rpc("is_co_owner", { p_owner_id: ownerId, p_user_id: user.id });
    if (!data) return res.status(403).json({ error: "Accès refusé" });
  }
  if (!isValidPin(pin)) return res.status(400).json({ error: "Le PIN doit être 4 chiffres" });

  try {
    const { data, error } = await supabaseServer.rpc("create_team_member_pin", {
      p_owner_id: ownerId, p_name: name, p_role: role ?? "member", p_pin: pin,
    });
    if (error) {
      if (error.message?.includes("PIN_DUPLICATE")) return res.status(409).json({ error: "Ce PIN est déjà utilisé par un autre membre" });
      console.error("[team/members POST] RPC error:", error);
      return res.status(500).json({ error: "Erreur serveur" });
    }
    return res.status(201).json(unwrapRpc(data));
  } catch (err) {
    console.error("[team/members POST]", err);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

// ─── PATCH /api/team/members/:id/pin ─────────────────────────────────────────
router.patch("/members/:id/pin", async (req: Request, res: Response) => {
  const user = await getSupabaseUser(req);
  if (!user) return res.status(401).json({ error: "Non autorisé" });

  const { id } = req.params;
  const { pin, ownerId } = req.body as { pin?: string; ownerId?: string };
  if (!pin || !ownerId) return res.status(400).json({ error: "pin et ownerId requis" });
  if (user.id !== ownerId) {
    const { data } = await supabaseServer.rpc("is_co_owner", { p_owner_id: ownerId, p_user_id: user.id });
    if (!data) return res.status(403).json({ error: "Accès refusé" });
  }
  if (!isValidPin(pin)) return res.status(400).json({ error: "Le PIN doit être 4 chiffres" });

  try {
    const { error } = await supabaseServer.rpc("update_member_pin", {
      p_member_id: id, p_owner_id: ownerId, p_new_pin: pin,
    });
    if (error) {
      if (error.message?.includes("PIN_DUPLICATE")) return res.status(409).json({ error: "Ce PIN est déjà utilisé par un autre membre" });
      console.error("[team/members PATCH pin] RPC error:", error);
      return res.status(500).json({ error: "Erreur serveur" });
    }
    return res.json({ ok: true });
  } catch (err) {
    console.error("[team/members PATCH pin]", err);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

// ─── GET /api/team/notes — liste des notes du membre connecté ────────────────
router.get("/notes", async (req: Request, res: Response) => {
  const token = extractBearer(req);
  if (!token) return res.status(401).json({ error: "Token manquant" });

  try {
    const { data, error } = await supabaseServer.rpc("get_member_notes", { p_token: token });
    if (error) {
      console.error("[team/notes GET] RPC error:", error);
      return res.status(500).json({ error: "Erreur serveur" });
    }
    return res.json(data ?? []);
  } catch (err) {
    console.error("[team/notes GET]", err);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

// ─── POST /api/team/notes — ajouter une note ─────────────────────────────────
router.post("/notes", async (req: Request, res: Response) => {
  const token = extractBearer(req);
  if (!token) return res.status(401).json({ error: "Token manquant" });

  const { chantierId, content } = req.body as { chantierId?: string; content?: string };
  if (!chantierId || !content?.trim()) return res.status(400).json({ error: "chantierId et content requis" });

  try {
    const { data, error } = await supabaseServer.rpc("insert_chantier_note", {
      p_token: token, p_chantier_id: chantierId, p_content: content.trim(),
    });
    if (error) {
      if (error.message?.includes("UNAUTHORIZED")) return res.status(401).json({ error: "Session expirée" });
      if (error.message?.includes("NOT_ASSIGNED")) return res.status(403).json({ error: "Chantier non assigné" });
      console.error("[team/notes POST] RPC error:", error);
      return res.status(500).json({ error: "Erreur serveur" });
    }
    return res.status(201).json(unwrapRpc(data));
  } catch (err) {
    console.error("[team/notes POST]", err);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

// ─── GET /api/team/co-owners — liste des co-patrons ──────────────────────────
router.get("/co-owners", async (req: Request, res: Response) => {
  const user = await getSupabaseUser(req);
  if (!user) return res.status(401).json({ error: "Non autorisé" });

  const { ownerId } = req.query as { ownerId?: string };
  if (!ownerId) return res.status(400).json({ error: "ownerId requis" });

  // Vérifier que le demandeur est bien le patron ou un co-patron
  const isOwner = user.id === ownerId;
  if (!isOwner) {
    const { data } = await supabaseServer.rpc("is_co_owner", { p_owner_id: ownerId, p_user_id: user.id });
    if (!data) return res.status(403).json({ error: "Accès refusé" });
  }

  try {
    const { data, error } = await supabaseServer
      .from("app_co_owners")
      .select("id, co_owner_id, co_owner_email, created_at")
      .eq("owner_id", ownerId)
      .order("created_at", { ascending: true });
    if (error) return res.status(500).json({ error: "Erreur serveur" });
    return res.json(data ?? []);
  } catch (err) {
    console.error("[team/co-owners GET]", err);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

// ─── POST /api/team/co-owners — ajouter un co-patron par email ───────────────
router.post("/co-owners", async (req: Request, res: Response) => {
  const user = await getSupabaseUser(req);
  if (!user) return res.status(401).json({ error: "Non autorisé" });

  const { email, ownerId } = req.body as { email?: string; ownerId?: string };
  if (!email?.trim() || !ownerId) return res.status(400).json({ error: "Email et ownerId requis" });

  const normalizedEmail = email.trim().toLowerCase();

  // Vérifier que le demandeur est le patron ou un co-patron
  const isOwner = user.id === ownerId;
  if (!isOwner) {
    const { data } = await supabaseServer.rpc("is_co_owner", { p_owner_id: ownerId, p_user_id: user.id });
    if (!data) return res.status(403).json({ error: "Accès refusé" });
  }

  if (user.email === normalizedEmail) {
    return res.status(400).json({ error: "Vous ne pouvez pas vous ajouter comme co-patron" });
  }

  try {
    // Chercher le compte dans user_profiles (créé lors du signUp)
    const { data: profile, error: profileError } = await supabaseServer
      .from("user_profiles")
      .select("id, email")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (profileError) return res.status(500).json({ error: "Erreur serveur" });
    if (!profile) {
      return res.status(404).json({
        error: "Aucun compte CALDY trouvé pour cet email. L'utilisateur doit d'abord créer un compte.",
      });
    }

    const { error: insertError } = await supabaseServer
      .from("app_co_owners")
      .insert({ owner_id: ownerId, co_owner_id: profile.id, co_owner_email: normalizedEmail });

    if (insertError) {
      if (insertError.code === "23505") return res.status(409).json({ error: "Ce compte est déjà co-patron" });
      console.error("[team/co-owners POST] DB error:", insertError);
      return res.status(500).json({ error: "Erreur serveur" });
    }

    return res.status(201).json({ co_owner_id: profile.id, co_owner_email: normalizedEmail });
  } catch (err) {
    console.error("[team/co-owners POST]", err);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

// ─── DELETE /api/team/co-owners/:userId ───────────────────────────────────────
router.delete("/co-owners/:userId", async (req: Request, res: Response) => {
  const user = await getSupabaseUser(req);
  if (!user) return res.status(401).json({ error: "Non autorisé" });

  const { ownerId } = req.body as { ownerId?: string };
  if (!ownerId) return res.status(400).json({ error: "ownerId requis" });

  const isOwner = user.id === ownerId;
  if (!isOwner) {
    const { data } = await supabaseServer.rpc("is_co_owner", { p_owner_id: ownerId, p_user_id: user.id });
    if (!data) return res.status(403).json({ error: "Accès refusé" });
  }

  try {
    const { error } = await supabaseServer
      .from("app_co_owners")
      .delete()
      .eq("owner_id", ownerId)
      .eq("co_owner_id", req.params.userId);
    if (error) return res.status(500).json({ error: "Erreur serveur" });
    return res.json({ ok: true });
  } catch (err) {
    console.error("[team/co-owners DELETE]", err);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

export const teamMemberAuthRouter = router;
