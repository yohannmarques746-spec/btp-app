import { Router, type Request, type Response } from "express";
import { supabaseServer } from "../supabaseServer";

const router = Router();

// Charger la liste des propriétaires depuis VITE_OWNER_IDS (format: UUID1,UUID2,...)
const OWNER_IDS = (process.env.VITE_OWNER_IDS ?? "")
  .split(",")
  .map((id) => id.trim())
  .filter(Boolean);

const OWNER_ID = OWNER_IDS[0] ?? ""; // Premier propriétaire (principal)
const PIN_RE = /^\d{6}$/;

/**
 * Vérifie si un UUID est dans la liste des propriétaires
 */
function isOwner(userId: string): boolean {
  return OWNER_IDS.includes(userId);
}

// POST /api/auth/resolve-session
// Appelé après signIn Supabase pour déterminer le rôle et créer une session membre si employé
router.post("/resolve-session", async (req: Request, res: Response): Promise<void> => {
  const auth = req.headers.authorization;
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;

  if (!token) {
    res.status(401).json({ error: "Token manquant" });
    return;
  }

  const {
    data: { user },
    error: userError,
  } = await supabaseServer.auth.getUser(token);

  if (userError || !user) {
    res.status(401).json({ error: "Token invalide" });
    return;
  }

  if (!OWNER_ID) {
    res.status(500).json({ error: "VITE_OWNER_IDS non configuré" });
    return;
  }

  const { pin } = req.body as { pin?: string };

  // Propriétaire (dans la liste des propriétaires)
  if (isOwner(user.id)) {
    res.json({ type: "owner" });
    return;
  }

  // Co-patron
  const { data: coOwner } = await supabaseServer
    .from("app_co_owners")
    .select("id")
    .eq("owner_id", OWNER_ID)
    .eq("co_owner_id", user.id)
    .maybeSingle();

  if (coOwner) {
    res.json({ type: "owner" });
    return;
  }

  // Employé — lookup dans team_members
  const { data: member, error: memberError } = await supabaseServer
    .from("team_members")
    .select("id, name, email, role, status, permissions, pin_hash")
    .eq("auth_user_id", user.id)
    .eq("user_id", OWNER_ID)
    .maybeSingle();

  if (memberError) {
    console.error("[auth/resolve-session] DB error:", memberError);
    res.status(500).json({ error: "Erreur serveur" });
    return;
  }

  if (!member) {
    // Premier login — créer l'entrée team_members
    const email = user.email ?? "";
    const name = (user.user_metadata?.full_name as string | undefined) ?? email;

    const { data: newMember, error: createError } = await supabaseServer
      .from("team_members")
      .insert({
        user_id: OWNER_ID,
        auth_user_id: user.id,
        email,
        name,
        role: "employee",
        status: "en_attente_confirmation",
        permissions: {
          crm: false,
          planning: false,
          devis: false,
          factures: false,
          chantiers: false,
          clients: false,
          dashboard: false,
        },
      })
      .select("id")
      .single();

    if (createError) {
      console.error("[auth/resolve-session] create error:", createError);
      res.status(500).json({ error: "Erreur serveur" });
      return;
    }

    res.json({
      type: "employee",
      status: "en_attente_confirmation",
      isNew: true,
      memberId: newMember?.id,
    });
    return;
  }

  const status = member.status as string;

  if (status === "en_attente_confirmation") {
    res.json({ type: "employee", status });
    return;
  }

  if (status === "bloqué" || status === "bloque") {
    res.json({ type: "employee", status: "bloqué" });
    return;
  }

  if (status === "refusé" || status === "refuse") {
    res.json({ type: "employee", status: "refusé" });
    return;
  }

  if (status !== "actif") {
    res.json({ type: "employee", status });
    return;
  }

  // Employé actif — vérifier PIN
  const requiresPin = !!member.pin_hash;

  if (requiresPin && (!pin || !PIN_RE.test(pin))) {
    res.json({ type: "employee", status: "actif", requiresPin: true });
    return;
  }

  // Créer session membre via RPC
  const { data: sessionData, error: sessionError } = await supabaseServer.rpc(
    "create_member_session_email",
    {
      p_member_id: member.id,
      p_owner_id: OWNER_ID,
      p_pin: pin ?? null,
    }
  );

  if (sessionError) {
    const msg = sessionError.message ?? "";
    if (msg.includes("PIN_REQUIRED")) {
      res.json({ type: "employee", status: "actif", requiresPin: true });
    } else if (msg.includes("PIN_INCORRECT")) {
      res.status(401).json({ error: "PIN_INCORRECT", message: "PIN incorrect" });
    } else {
      console.error("[auth/resolve-session] session RPC error:", sessionError);
      res.status(500).json({ error: "Erreur serveur" });
    }
    return;
  }

  const row = Array.isArray(sessionData) ? sessionData[0] : sessionData;
  if (!row) {
    res.status(500).json({ error: "Erreur création session" });
    return;
  }

  const r = row as Record<string, unknown>;
  res.json({
    type: "employee",
    status: "actif",
    token: r.session_token,
    memberId: member.id,
    name: r.member_name,
    role: r.member_role,
    permissions: r.member_permissions,
  });
});

export const authRouter = router;
