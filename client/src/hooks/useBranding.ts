import { useMemo } from "react";
import { useEntrepriseProfil } from "@/hooks/useEntrepriseProfil";

const FALLBACK_BRAND_NAME = "CALDY";

function normalizeSiteWeb(value: string | null | undefined): string {
  if (!value) return "";
  return value.replace(/^https?:\/\//i, "").replace(/\/+$/, "").trim();
}

export function useBranding() {
  const { profil, loading } = useEntrepriseProfil();

  return useMemo(() => {
    const brandName = profil?.nom?.trim() || FALLBACK_BRAND_NAME;
    const siteWeb = normalizeSiteWeb(profil?.site_web);
    const brandTagline = siteWeb || "";
    const brandEmailPlaceholder = siteWeb ? `vous@${siteWeb}` : "vous@entreprise.ch";
    const brandLogoUrl = profil?.logo_url?.trim() || null;

    return {
      brandName,
      brandTagline,
      brandEmailPlaceholder,
      brandLogoUrl,
      loadingBranding: loading,
    };
  }, [profil, loading]);
}
