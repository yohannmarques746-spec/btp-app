import { Router, type Request, type Response } from "express";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { z } from "zod";

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

if (!process.env.RESEND_API_KEY) {
  console.error(
    "[crm-email] RESEND_API_KEY est absent : les envois retourneront 503 jusqu'à configuration.",
  );
}

function getBearerToken(req: Request): string | null {
  const h = req.headers.authorization;
  if (!h?.startsWith("Bearer ")) return null;
  return h.slice("Bearer ".length).trim() || null;
}

export function createCrmEmailRouter(): Router {
  const router = Router();

  router.post("/send-email", async (req: Request, res: Response) => {
    try {
      const apiKey = process.env.RESEND_API_KEY;
      const from = process.env.RESEND_FROM;
      const supabaseUrl = process.env.SUPABASE_URL;
      const supabaseAnon = process.env.SUPABASE_ANON_KEY;

      if (!apiKey || !from) {
        return res.status(503).json({ error: "Service email indisponible" });
      }

      if (!supabaseUrl || !supabaseAnon) {
        console.error(
          "[crm-email] SUPABASE_URL ou SUPABASE_ANON_KEY manquant — auth impossible.",
        );
        return res.status(503).json({ error: "Service email indisponible" });
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
        const first = parsed.error.issues[0]?.message ?? "Validation invalide";
        return res.status(400).json({ error: first });
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
        return res.status(503).json({ error: "Service email indisponible" });
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
