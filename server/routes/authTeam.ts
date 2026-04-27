import { Router, type Request, type Response } from "express";
import { supabaseServer } from "../supabaseServer";
import { generateCsrfToken, csrfMiddleware } from "../middleware/csrf";
import { rateLimitLoginMember } from "../middleware/rateLimit";

const router = Router();

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PIN_RE = /^\d{6}$/;
function isValidPin(pin: string): boolean {
  return PIN_RE.test(pin);
}

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
  const {
    data: { user },
    error,
  } = await supabaseServer.auth.getUser(token);
  if (error || !user) return null;
  return user;
}

// ─── GET /api/team/csrf-token — public, pas de CSRF requis ───────────────────
router.get("/csrf-token", (_req: Request, res: Response) => {
  res.json({ token: generateCsrfToken() });
});

// ─── Appliquer CSRF sur tous les POST/PUT/PATCH/DELETE suivants ───────────────
router.use(csrfMiddleware);

// ─── POST /api/team/login-pin ─────────────────────────────────────────────────
async function handleLoginPin(req: Request, res: Response): Promise<void> {
  const { pin, ownerId } = req.body as { pin?: string; ownerId?: string };
  if (!pin || !ownerId) {
    res.status(400).json({ error: "PIN et ownerId requis" });
    return;
  }
  if (!isValidPin(pin)) {
    res.status(401).json({ error: "PIN_INCORRECT", message: "Code incorrect. Le PIN doit être 6 chiffres." });
    return;
  }

  try {
    const { data, error } = await supabaseServer.rpc("login_member_pin", {
      input_pin: pin,
      p_owner_id: ownerId,
    });
    if (error) {
      console.error("[team/login-pin] RPC error:", error);
      res.status(500).json({ error: "Erreur serveur" });
      return;
    }
    const row = unwrapRpc(data);
    if (!row) {
      res.status(401).json({ error: "PIN_INCORRECT", message: "Code incorrect ou compte inactif" });
      return;
    }
    res.json({
      token: (row as Record<string, unknown>).session_token,
      memberId: (row as Record<string, unknown>).member_id,
      name: (row as Record<string, unknown>).member_name,
    });
  } catch (err) {
    console.error("[team/login-pin]", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
}

router.post("/login-pin", rateLimitLoginMember, handleLoginPin);
// Alias legacy pour rétrocompatibilité
router.post("/login", rateLimitLoginMember, handleLoginPin);

// ─── POST /api/team/login-invite ──────────────────────────────────────────────
router.post("/login-invite", rateLimitLoginMember, async (req: Request, res: Response): Promise<void> => {
  const { token, pin } = req.body as { token?: string; pin?: string };
  if (!token || !pin) {
    res.status(400).json({ error: "token et pin requis" });
    return;
  }
  if (!isValidPin(pin)) {
    res.status(401).json({ error: "PIN_INCORRECT", message: "Le PIN doit être 6 chiffres." });
    return;
  }

  try {
    // Vérifier l'invitation
    const { data: invData, error: invError } = await supabaseServer
      .from("team_invitations")
      .select("user_id, team_member_id, expires_at, used")
      .eq("token", token)
      .maybeSingle();

    if (invError) {
      console.error("[team/login-invite] DB error:", invError);
      res.status(500).json({ error: "Erreur serveur" });
      return;
    }
    if (!invData) {
      res.status(404).json({ error: "INVITE_INVALID", message: "Lien d'invitation invalide ou expiré" });
      return;
    }
    if (invData.used) {
      res.status(410).json({ error: "INVITE_USED", message: "Ce lien d'invitation a déjà été utilisé" });
      return;
    }
    if (new Date(invData.expires_at) < new Date()) {
      res.status(410).json({ error: "INVITE_EXPIRED", message: "Lien d'invitation expiré. Demandez une nouvelle invitation." });
      return;
    }

    // Authentifier le membre via son PIN
    const { data: loginData, error: loginError } = await supabaseServer.rpc("login_member_pin", {
      input_pin: pin,
      p_owner_id: invData.user_id,
    });
    if (loginError) {
      console.error("[team/login-invite] RPC error:", loginError);
      res.status(500).json({ error: "Erreur serveur" });
      return;
    }
    const loginRow = unwrapRpc(loginData);
    if (!loginRow) {
      res.status(401).json({ error: "PIN_INCORRECT", message: "Code PIN incorrect" });
      return;
    }

    const memberId = (loginRow as Record<string, unknown>).member_id as string;
    // Vérifier que le membre correspond bien à l'invitation
    if (invData.team_member_id && memberId !== invData.team_member_id) {
      res.status(403).json({ error: "PIN_INCORRECT", message: "Code PIN incorrect pour ce lien d'invitation" });
      return;
    }

    // Marquer l'invitation comme utilisée
    await supabaseServer
      .from("team_invitations")
      .update({ used: true, updated_at: new Date().toISOString() })
      .eq("token", token);

    res.json({
      token: (loginRow as Record<string, unknown>).session_token,
      memberId,
      name: (loginRow as Record<string, unknown>).member_name,
    });
  } catch (err) {
    console.error("[team/login-invite]", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ─── POST /api/team/logout ────────────────────────────────────────────────────
router.post("/logout", async (req: Request, res: Response): Promise<void> => {
  const token = extractBearer(req);
  if (!token) {
    res.status(401).json({ error: "Token manquant" });
    return;
  }
  try {
    await supabaseServer.rpc("logout_member", { p_token: token });
    res.json({ ok: true });
  } catch (err) {
    console.error("[team/logout]", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ─── GET /api/team/me et /api/team/session ────────────────────────────────────
async function handleGetSession(req: Request, res: Response): Promise<void> {
  const token = extractBearer(req);
  if (!token) {
    res.status(401).json({ error: "Token manquant" });
    return;
  }

  try {
    const { data, error } = await supabaseServer.rpc("get_member_session", { p_token: token });
    if (error) {
      console.error("[team/session] RPC error:", error);
      res.status(500).json({ error: "Erreur serveur" });
      return;
    }
    const row = unwrapRpc(data);
    if (!row) {
      res.status(401).json({ error: "SESSION_EXPIRED", message: "Session expirée ou invalide" });
      return;
    }

    res.json({
      memberId: (row as Record<string, unknown>).member_id,
      name: (row as Record<string, unknown>).member_name,
      permissions: (row as Record<string, unknown>).member_permissions,
      ownerId: (row as Record<string, unknown>).owner_id,
      assignedChantiers: (row as Record<string, unknown>).chantiers ?? [],
    });
  } catch (err) {
    console.error("[team/session]", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
}

router.get("/me", handleGetSession);
router.get("/session", handleGetSession);

// ─── POST /api/team/members ───────────────────────────────────────────────────
router.post("/members", async (req: Request, res: Response): Promise<void> => {
  const user = await getSupabaseUser(req);
  if (!user) {
    res.status(401).json({ error: "Non autorisé" });
    return;
  }

  const { name, pin, role, ownerId } = req.body as {
    name?: string;
    pin?: string;
    role?: string;
    ownerId?: string;
  };
  if (!name || !pin || !ownerId) {
    res.status(400).json({ error: "name, pin et ownerId requis" });
    return;
  }
  if (user.id !== ownerId) {
    const { data } = await supabaseServer.rpc("is_co_owner", {
      p_owner_id: ownerId,
      p_user_id: user.id,
    });
    if (!data) {
      res.status(403).json({ error: "Accès refusé" });
      return;
    }
  }
  if (!isValidPin(pin)) {
    res.status(400).json({ error: "Le PIN doit être 6 chiffres" });
    return;
  }

  try {
    const { data, error } = await supabaseServer.rpc("create_team_member_pin", {
      p_owner_id: ownerId,
      p_name: name,
      p_role: role ?? "member",
      p_pin: pin,
    });
    if (error) {
      if (error.message?.includes("PIN_DUPLICATE")) {
        res.status(409).json({ error: "Ce PIN est déjà utilisé par un autre membre" });
        return;
      }
      console.error("[team/members POST] RPC error:", error);
      res.status(500).json({ error: "Erreur serveur" });
      return;
    }
    res.status(201).json(unwrapRpc(data));
  } catch (err) {
    console.error("[team/members POST]", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ─── PATCH /api/team/members/:id/pin ─────────────────────────────────────────
router.patch("/members/:id/pin", async (req: Request, res: Response): Promise<void> => {
  const user = await getSupabaseUser(req);
  if (!user) {
    res.status(401).json({ error: "Non autorisé" });
    return;
  }

  const { id } = req.params;
  const { pin, ownerId } = req.body as { pin?: string; ownerId?: string };
  if (!pin || !ownerId) {
    res.status(400).json({ error: "pin et ownerId requis" });
    return;
  }
  if (user.id !== ownerId) {
    const { data } = await supabaseServer.rpc("is_co_owner", {
      p_owner_id: ownerId,
      p_user_id: user.id,
    });
    if (!data) {
      res.status(403).json({ error: "Accès refusé" });
      return;
    }
  }
  if (!isValidPin(pin)) {
    res.status(400).json({ error: "Le PIN doit être 6 chiffres" });
    return;
  }

  try {
    const { error } = await supabaseServer.rpc("update_member_pin", {
      p_member_id: id,
      p_owner_id: ownerId,
      p_new_pin: pin,
    });
    if (error) {
      if (error.message?.includes("PIN_DUPLICATE")) {
        res.status(409).json({ error: "Ce PIN est déjà utilisé par un autre membre" });
        return;
      }
      console.error("[team/members PATCH pin] RPC error:", error);
      res.status(500).json({ error: "Erreur serveur" });
      return;
    }
    res.json({ ok: true });
  } catch (err) {
    console.error("[team/members PATCH pin]", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ─── GET /api/team/notes ──────────────────────────────────────────────────────
router.get("/notes", async (req: Request, res: Response): Promise<void> => {
  const token = extractBearer(req);
  if (!token) {
    res.status(401).json({ error: "Token manquant" });
    return;
  }

  try {
    const { data, error } = await supabaseServer.rpc("get_member_notes", { p_token: token });
    if (error) {
      console.error("[team/notes GET] RPC error:", error);
      res.status(500).json({ error: "Erreur serveur" });
      return;
    }
    res.json(data ?? []);
  } catch (err) {
    console.error("[team/notes GET]", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ─── POST /api/team/notes ─────────────────────────────────────────────────────
router.post("/notes", async (req: Request, res: Response): Promise<void> => {
  const token = extractBearer(req);
  if (!token) {
    res.status(401).json({ error: "Token manquant" });
    return;
  }

  const { chantierId, content } = req.body as {
    chantierId?: string;
    content?: string;
  };
  if (!chantierId || !content?.trim()) {
    res.status(400).json({ error: "chantierId et content requis" });
    return;
  }

  try {
    const { data, error } = await supabaseServer.rpc("insert_chantier_note", {
      p_token: token,
      p_chantier_id: chantierId,
      p_content: content.trim(),
    });
    if (error) {
      if (error.message?.includes("UNAUTHORIZED")) {
        res.status(401).json({ error: "Session expirée" });
        return;
      }
      if (error.message?.includes("NOT_ASSIGNED")) {
        res.status(403).json({ error: "Chantier non assigné" });
        return;
      }
      console.error("[team/notes POST] RPC error:", error);
      res.status(500).json({ error: "Erreur serveur" });
      return;
    }
    res.status(201).json(unwrapRpc(data));
  } catch (err) {
    console.error("[team/notes POST]", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ─── GET /api/team/co-owners ──────────────────────────────────────────────────
router.get("/co-owners", async (req: Request, res: Response): Promise<void> => {
  const user = await getSupabaseUser(req);
  if (!user) {
    res.status(401).json({ error: "Non autorisé" });
    return;
  }

  const { ownerId } = req.query as { ownerId?: string };
  if (!ownerId) {
    res.status(400).json({ error: "ownerId requis" });
    return;
  }

  const isOwner = user.id === ownerId;
  if (!isOwner) {
    const { data } = await supabaseServer.rpc("is_co_owner", {
      p_owner_id: ownerId,
      p_user_id: user.id,
    });
    if (!data) {
      res.status(403).json({ error: "Accès refusé" });
      return;
    }
  }

  try {
    const { data, error } = await supabaseServer
      .from("app_co_owners")
      .select("id, co_owner_id, co_owner_email, created_at")
      .eq("owner_id", ownerId)
      .order("created_at", { ascending: true });
    if (error) {
      res.status(500).json({ error: "Erreur serveur" });
      return;
    }
    res.json(data ?? []);
  } catch (err) {
    console.error("[team/co-owners GET]", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ─── POST /api/team/co-owners ─────────────────────────────────────────────────
router.post("/co-owners", async (req: Request, res: Response): Promise<void> => {
  const user = await getSupabaseUser(req);
  if (!user) {
    res.status(401).json({ error: "Non autorisé" });
    return;
  }

  const { email, ownerId } = req.body as { email?: string; ownerId?: string };
  if (!email?.trim() || !ownerId) {
    res.status(400).json({ error: "Email et ownerId requis" });
    return;
  }

  const normalizedEmail = email.trim().toLowerCase();
  const isOwner = user.id === ownerId;
  if (!isOwner) {
    const { data } = await supabaseServer.rpc("is_co_owner", {
      p_owner_id: ownerId,
      p_user_id: user.id,
    });
    if (!data) {
      res.status(403).json({ error: "Accès refusé" });
      return;
    }
  }

  if (user.email === normalizedEmail) {
    res.status(400).json({ error: "Vous ne pouvez pas vous ajouter comme co-patron" });
    return;
  }

  try {
    const { data: profile, error: profileError } = await supabaseServer
      .from("user_profiles")
      .select("id, email")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (profileError) {
      res.status(500).json({ error: "Erreur serveur" });
      return;
    }
    if (!profile) {
      res.status(404).json({
        error: "Aucun compte CALDY trouvé pour cet email. L'utilisateur doit d'abord créer un compte.",
      });
      return;
    }

    const { error: insertError } = await supabaseServer
      .from("app_co_owners")
      .insert({ owner_id: ownerId, co_owner_id: profile.id, co_owner_email: normalizedEmail });

    if (insertError) {
      if (insertError.code === "23505") {
        res.status(409).json({ error: "Ce compte est déjà co-patron" });
        return;
      }
      console.error("[team/co-owners POST] DB error:", insertError);
      res.status(500).json({ error: "Erreur serveur" });
      return;
    }

    res.status(201).json({ co_owner_id: profile.id, co_owner_email: normalizedEmail });
  } catch (err) {
    console.error("[team/co-owners POST]", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ─── DELETE /api/team/co-owners/:userId ───────────────────────────────────────
router.delete("/co-owners/:userId", async (req: Request, res: Response): Promise<void> => {
  const user = await getSupabaseUser(req);
  if (!user) {
    res.status(401).json({ error: "Non autorisé" });
    return;
  }

  const { ownerId } = req.body as { ownerId?: string };
  if (!ownerId) {
    res.status(400).json({ error: "ownerId requis" });
    return;
  }

  const isOwner = user.id === ownerId;
  if (!isOwner) {
    const { data } = await supabaseServer.rpc("is_co_owner", {
      p_owner_id: ownerId,
      p_user_id: user.id,
    });
    if (!data) {
      res.status(403).json({ error: "Accès refusé" });
      return;
    }
  }

  try {
    const { error } = await supabaseServer
      .from("app_co_owners")
      .delete()
      .eq("owner_id", ownerId)
      .eq("co_owner_id", req.params.userId);
    if (error) {
      res.status(500).json({ error: "Erreur serveur" });
      return;
    }
    res.json({ ok: true });
  } catch (err) {
    console.error("[team/co-owners DELETE]", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

export const teamAuthRouter = router;
