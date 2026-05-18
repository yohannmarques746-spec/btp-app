import { supabase } from "@/lib/supabase";

export const CHANTIER_DOCUMENTS_BUCKET = "chantier-documents";

/**
 * Nettoie un nom de fichier pour qu'il soit valide dans un chemin Storage :
 * remplace accents et caractères spéciaux par `_`, conserve `.`, `-` et `_`.
 */
export function sanitizeFilename(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "fichier";
  const normalized = trimmed.normalize("NFD").replace(/[̀-ͯ]/g, "");
  const cleaned = normalized
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^[._-]+|[._-]+$/g, "");
  return cleaned || "fichier";
}

function safeRandomUUID(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    try {
      return crypto.randomUUID();
    } catch {
      /* fallback below */
    }
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export interface UploadedDocument {
  /** URL publique stockée dans `documents_uploades.url`. */
  publicUrl: string;
  /** Chemin Storage (utile pour supprimer plus tard). */
  path: string;
  /** Nom original sanitisé, pratique pour l'affichage. */
  filename: string;
}

/**
 * Upload un fichier dans le bucket `chantier-documents` au chemin
 * `${userId}/${chantierId}/${uuid}-${sanitized}` et retourne l'URL publique.
 *
 * Le bucket est public en lecture (cf. migration), donc le lien retourné est
 * partageable. Les écritures sont restreintes par RLS au préfixe `auth.uid()`.
 */
export async function uploadDocumentToStorage(
  file: File,
  userId: string,
  chantierId: string,
): Promise<UploadedDocument> {
  if (!userId) throw new Error("Utilisateur non authentifié");
  if (!chantierId) throw new Error("Chantier introuvable");
  if (!file) throw new Error("Aucun fichier fourni");

  const sanitized = sanitizeFilename(file.name);
  const filename = `${safeRandomUUID()}-${sanitized}`;
  const path = `${userId}/${chantierId}/${filename}`;

  const { error: uploadError } = await supabase.storage
    .from(CHANTIER_DOCUMENTS_BUCKET)
    .upload(path, file, {
      upsert: false,
      cacheControl: "3600",
      contentType: file.type || undefined,
    });

  if (uploadError) {
    console.error("uploadDocumentToStorage", uploadError);
    throw uploadError;
  }

  const { data } = supabase.storage.from(CHANTIER_DOCUMENTS_BUCKET).getPublicUrl(path);

  return {
    publicUrl: data.publicUrl,
    path,
    filename: sanitized,
  };
}
