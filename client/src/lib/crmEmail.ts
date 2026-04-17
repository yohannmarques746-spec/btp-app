import { supabase } from "@/lib/supabase";

export type EmailPayload = {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  replyTo?: string;
  type?: "devis" | "relance";
};

export async function sendCrmEmail(
  payload: EmailPayload,
): Promise<{ id: string }> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new Error("Non authentifié");
  }

  const res = await fetch("/api/crm/send-email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    let message = text;
    if (text.trimStart().startsWith("{")) {
      try {
        const j = JSON.parse(text) as {
          error?: string;
          detail?: string;
          field?: string;
        };
        const parts = [j.error, j.detail, j.field ? `champ : ${j.field}` : ""].filter(
          Boolean,
        );
        message = parts.join(" — ") || text;
      } catch {
        /* garder le corps brut */
      }
    }
    throw new Error(message);
  }

  return res.json() as Promise<{ id: string }>;
}
