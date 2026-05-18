import { useMemo } from "react";
import { useDevis } from "@/hooks/useDevis";
import { SearchableSelect, type SearchableSelectItem } from "@/components/ui/searchable-select";
import { formatCHF } from "@/utils/chf";
import type { Devis } from "@/types/devis";

export interface DevisSelectionDetails {
  devisId: string | null;
  devisNumero: string | null;
  /** Sous-total HT du devis source. `null` quand on désélectionne / texte libre. */
  montantHT: number | null;
}

export interface DevisAutocompleteInputProps {
  /** Identifiant du devis sélectionné. */
  devisId: string | null;
  /** Numéro de devis utilisé en fallback (legacy string[]) ou affiché dans le trigger. */
  devisNumero: string | null;
  /** Appelé à chaque changement de sélection / saisie libre. */
  onChange: (details: DevisSelectionDetails) => void;
  /** Liste d'IDs déjà liés ailleurs (filtre la liste). */
  disabledIds?: string[];
  /** Autorise la saisie d'un numéro libre (rétro-compatibilité). */
  allowFreeText?: boolean;
  placeholder?: string;
  className?: string;
}

export function DevisAutocompleteInput({
  devisId,
  devisNumero,
  onChange,
  disabledIds,
  allowFreeText = true,
  placeholder = "Chercher un devis par numéro ou client…",
  className,
}: DevisAutocompleteInputProps) {
  const { devisList, loading } = useDevis();

  const items = useMemo<SearchableSelectItem<Devis>[]>(() => {
    const excluded = new Set<string>(disabledIds ?? []);
    return devisList
      .filter((devis) => !excluded.has(devis.id) || devis.id === devisId)
      .map((devis) => ({
        value: devis.id,
        label: `Devis ${devis.numero}`,
        secondary: [devis.client?.nom, formatCHF(devis.sousTotalHT)]
          .filter((part): part is string => Boolean(part && part.length > 0))
          .join(" · "),
        raw: devis,
      }));
  }, [devisList, disabledIds, devisId]);

  return (
    <SearchableSelect<Devis>
      items={items}
      value={devisId}
      freeTextLabel={!devisId && devisNumero ? `Devis ${devisNumero}` : null}
      onChange={(value, raw) => {
        if (!value || !raw) {
          onChange({ devisId: null, devisNumero: null, montantHT: null });
          return;
        }
        onChange({ devisId: value, devisNumero: raw.numero, montantHT: raw.sousTotalHT });
      }}
      onCreate={
        allowFreeText
          ? (text) => onChange({ devisId: null, devisNumero: text, montantHT: null })
          : undefined
      }
      onClear={() => onChange({ devisId: null, devisNumero: null, montantHT: null })}
      placeholder={placeholder}
      emptyText="Aucun devis trouvé"
      allowFreeText={allowFreeText}
      loading={loading}
      className={className}
    />
  );
}
