import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Emetteur } from "@/types/devis";

export const EMPTY_PROFIL_ENTREPRISE: Emetteur = {
  nom: "",
  adresse: "",
  npa: "",
  ville: "",
  ide: "",
  email: "",
  telephone: "",
  iban: "",
  logo: "",
  nonAssujettiTVA: false,
};

function mapRowToEmetteur(row: {
  nom: string | null;
  adresse: string | null;
  npa: string | null;
  localite: string | null;
  numero_ide: string | null;
  email: string | null;
  telephone: string | null;
  iban: string | null;
  logo_url: string | null;
} | null): Emetteur {
  if (!row) return { ...EMPTY_PROFIL_ENTREPRISE };
  return {
    nom: row.nom ?? "",
    adresse: row.adresse ?? "",
    npa: row.npa ?? "",
    ville: row.localite ?? "",
    ide: row.numero_ide ?? "",
    email: row.email ?? "",
    telephone: row.telephone ?? "",
    iban: row.iban ?? "",
    logo: row.logo_url ?? "",
    nonAssujettiTVA: false,
  };
}

export function useProfilEntreprise() {
  const [profile, setProfile] = useState<Emetteur>({ ...EMPTY_PROFIL_ENTREPRISE });
  const [profileId, setProfileId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: fetchError } = await supabase
      .from("profil_entreprise")
      .select("id, nom, adresse, npa, localite, numero_ide, email, telephone, iban, logo_url")
      .limit(1)
      .maybeSingle();

    if (fetchError) {
      console.error("useProfilEntreprise.refresh", fetchError);
      setError(fetchError.message);
      setLoading(false);
      return;
    }

    setProfileId(data?.id ?? null);
    setProfile(mapRowToEmetteur(data));
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const saveProfile = useCallback(async (values: Emetteur) => {
    setError(null);
    const payload = {
      id: profileId ?? undefined,
      nom: values.nom || null,
      adresse: values.adresse || null,
      npa: values.npa || null,
      localite: values.ville || null,
      numero_ide: values.ide || null,
      email: values.email || null,
      telephone: values.telephone || null,
      iban: values.iban || null,
      logo_url: values.logo || null,
    };

    const { data, error: saveError } = await supabase
      .from("profil_entreprise")
      .upsert(payload, { onConflict: "user_id" })
      .select("id, nom, adresse, npa, localite, numero_ide, email, telephone, iban, logo_url")
      .single();

    if (saveError) {
      console.error("useProfilEntreprise.saveProfile", saveError);
      setError(saveError.message);
      return { error: saveError };
    }

    setProfileId(data.id);
    setProfile(mapRowToEmetteur(data));
    return { error: null };
  }, [profileId]);

  return { profile, loading, error, refresh, saveProfile };
}

