/** Garantit que les `.env` sont chargés avant de lire `process.env` (ordre d’import ES modules non garanti). */
import "./load-env";
import { Router, type Request, type Response } from "express";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { z } from "zod";

/** Trimme et retire une paire de guillemets englobants souvent ajoutée par erreur dans .env */
function normalizeResendFrom(raw: string | undefined): string {
  if (!raw) return "";
  let s = raw.trim();
  if (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'"))
  ) {
    s = s.slice(1, -1).trim();
  }
  return s;
}

/** Vérifie un expéditeur du type email@domaine.tld ou Nom <email@domaine.tld> */
function resendFromLooksValid(from: string): boolean {
  const bare = /^[^\s<]+@[^\s<>]+\.[^\s<>]+$/;
  const named = /^[\s\S]*<[^\s<>]+@[^\s<>]+\.[^\s<>]+>\s*$/;
  return bare.test(from) || named.test(from);
}

const emailSchema = z
  .object({
    to: z.string().email(),
    subject: z.string().min(1).max(200),
    html: z.string().optional(),
    text: z.string().optional(),
    replyTo: z.string().email().optional(),
    type: z.enum(["devis", "relance"]).optional(),
  })
  .refine((d) => !!(d.html || d.text), {
    message: "html ou text requis",
  });

function getBearerToken(req: Request): string | null {
  const h = req.headers.authorization;
  if (!h?.startsWith("Bearer ")) return null;
  return h.slice("Bearer ".length).trim() || null;
}

export function createCrmEmailRouter(): Router {
  if (!process.env.RESEND_API_KEY?.trim()) {
    console.warn(
      "[crm-email] RESEND_API_KEY absent ou vide après chargement des .env — complète / enregistre .env (racine ou client/) puis redémarre.",
    );
  }
  const router = Router();

  router.post("/send-email", async (req: Request, res: Response) => {
    try {
      const apiKey = process.env.RESEND_API_KEY?.trim();
      const from = normalizeResendFrom(process.env.RESEND_FROM);
      const supabaseUrl = process.env.SUPABASE_URL?.trim();
      const supabaseAnon = process.env.SUPABASE_ANON_KEY?.trim();

      if (!apiKey || !from) {
        return res.status(503).json({
          error: "Service email indisponible",
          detail: !apiKey
            ? "RESEND_API_KEY manquant ou vide : complète le .env à la racine (ou client/.env), enregistre le fichier, redémarre npm run dev."
            : "RESEND_FROM manquant ou vide : ex. contact@domaine-verifie.resend",
        });
      }

      if (!resendFromLooksValid(from)) {
        return res.status(503).json({
          error: "Service email indisponible",
          detail:
            "RESEND_FROM invalide : utilisez email@domaine.com ou « Nom <email@domaine.com> ». Dans .env, mettez des guillemets si la valeur contient des espaces (ex. RESEND_FROM=\"App <onboarding@resend.dev>\").",
        });
      }

      if (!supabaseUrl || !supabaseAnon) {
        console.error(
          "[crm-email] SUPABASE_URL ou SUPABASE_ANON_KEY manquant — auth impossible.",
        );
        return res.status(503).json({
          error: "Service email indisponible",
          detail:
            "SUPABASE_URL ou SUPABASE_ANON_KEY manquant côté serveur. Ajoute-les au .env racine ou VITE_SUPABASE_* dans client/.env (recopie auto au démarrage).",
        });
      }

      const token = getBearerToken(req);
      if (!token) {
        return res.status(401).json({ error: "Non authentifié" });
      }

      const supabase = createClient(supabaseUrl, supabaseAnon, {
        global: { headers: { Authorization: `Bearer ${token}` } },
      });

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        return res.status(401).json({ error: "Non authentifié" });
      }

      const parsed = emailSchema.safeParse(req.body);
      if (!parsed.success) {
        const issue = parsed.error.issues[0];
        const first = issue?.message ?? "Validation invalide";
        return res.status(400).json({
          error: first,
          ...(issue?.path?.length && { field: issue.path.join(".") }),
        });
      }

      const body = parsed.data;
      const resend = new Resend(apiKey);

      const tags = body.type
        ? ([{ name: "type", value: body.type }] as const)
        : undefined;

      const result = body.html
        ? await resend.emails.send({
            from,
            to: body.to,
            subject: body.subject,
            html: body.html,
            ...(body.text ? { text: body.text } : {}),
            ...(body.replyTo ? { replyTo: body.replyTo } : {}),
            ...(tags ? { tags: [...tags] } : {}),
          })
        : await resend.emails.send({
            from,
            to: body.to,
            subject: body.subject,
            text: body.text as string,
            ...(body.replyTo ? { replyTo: body.replyTo } : {}),
            ...(tags ? { tags: [...tags] } : {}),
          });

      if (result.error) {
        console.error("[crm-email] Erreur Resend:", result.error);
        const err = result.error as {
          message?: string;
          statusCode?: number;
          name?: string;
        };
        const sc =
          typeof err.statusCode === "number" &&
          err.statusCode >= 400 &&
          err.statusCode < 600
            ? err.statusCode
            : 503;
        const isResendValidation = sc === 422 || err.name === "validation_error";
        return res.status(sc).json({
          error: isResendValidation
            ? "Resend a refusé l’envoi (expéditeur « from » ou domaine à vérifier)"
            : "Service email indisponible",
          ...(err.message && {
            detail: err.message,
          }),
        });
      }

      const id = result.data?.id;
      if (!id) {
        console.error("[crm-email] Réponse Resend sans id.");
        return res.status(503).json({ error: "Service email indisponible" });
      }

      return res.status(200).json({ id });
    } catch (err) {
      console.error("[crm-email] Exception non gérée:", err);
      return res.status(503).json({ error: "Service email indisponible" });
    }
  });

  return router;
}
