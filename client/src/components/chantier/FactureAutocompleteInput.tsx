import { useMemo } from "react";
import { useFactures, type FactureRecord } from "@/hooks/useFactures";
import { SearchableSelect, type SearchableSelectItem } from "@/components/ui/searchable-select";
import { formatCHF } from "@/utils/chf";

export interface FactureSelectionDetails {
  factureId: string | null;
  factureNumero: string | null;
  /** Montant TTC de la facture source (utilisé pour pré-remplir le champ facturé). */
  montantTTC: number | null;
}

export interface FactureAutocompleteInputProps {
  factureId: string | null;
  factureNumero: string | null;
  onChange: (details: FactureSelectionDetails) => void;
  /** Filtre côté client : ne propose que les factures de ce client. */
  clientId?: string | null;
  disabledIds?: string[];
  allowFreeText?: boolean;
  placeholder?: string;
  className?: string;
}

function statusLabel(status: FactureRecord["statut"]): string {
  switch (status) {
    case "payee":
      return "payée";
    case "en_retard":
      return "en retard";
    case "non_payee":
    default:
      return "non payée";
  }
}

export function FactureAutocompleteInput({
  factureId,
  factureNumero,
  onChange,
  clientId,
  disabledIds,
  allowFreeText = true,
  placeholder = "Chercher une facture par numéro…",
  className,
}: FactureAutocompleteInputProps) {
  const { factures, loading } = useFactures();

  const items = useMemo<SearchableSelectItem<FactureRecord>[]>(() => {
    const excluded = new Set<string>(disabledIds ?? []);
    return factures
      .filter((facture) => !clientId || facture.clientId === clientId || facture.id === factureId)
      .filter((facture) => !excluded.has(facture.id) || facture.id === factureId)
      .map((facture) => ({
        value: facture.id,
        label: `Facture ${facture.numero}`,
        secondary: `${formatCHF(facture.montantTTC)} · ${statusLabel(facture.statut)}`,
        raw: facture,
      }));
  }, [factures, clientId, disabledIds, factureId]);

  return (
    <SearchableSelect<FactureRecord>
      items={items}
      value={factureId}
      freeTextLabel={!factureId && factureNumero ? `Facture ${factureNumero}` : null}
      onChange={(value, raw) => {
        if (!value || !raw) {
          onChange({ factureId: null, factureNumero: null, montantTTC: null });
          return;
        }
        onChange({
          factureId: value,
          factureNumero: raw.numero,
          montantTTC: raw.montantTTC,
        });
      }}
      onCreate={
        allowFreeText
          ? (text) => onChange({ factureId: null, factureNumero: text, montantTTC: null })
          : undefined
      }
      onClear={() => onChange({ factureId: null, factureNumero: null, montantTTC: null })}
      placeholder={placeholder}
      emptyText="Aucune facture trouvée"
      allowFreeText={allowFreeText}
      loading={loading}
      className={className}
    />
  );
}
