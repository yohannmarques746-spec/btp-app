import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronsUpDown, Plus, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export interface SearchableSelectItem<T> {
  /** Identifiant unique de l'élément (devient la valeur sélectionnée). */
  value: string;
  /** Libellé principal affiché dans la liste et dans le trigger. */
  label: string;
  /** Libellé secondaire (ex : nom du client, montant). */
  secondary?: string;
  /** Donnée brute associée, retournée à `onChange` (ex : Devis complet). */
  raw: T;
}

export interface SearchableSelectProps<T> {
  items: SearchableSelectItem<T>[];
  /** Valeur sélectionnée (par défaut `null`). */
  value: string | null;
  /**
   * Label affiché quand `value` ne correspond à aucun item — utile pour les valeurs
   * libres saisies via `onCreate` qui ne sont pas dans la liste (cas string[] legacy).
   */
  freeTextLabel?: string | null;
  /** Appelé quand un item est sélectionné. `raw` est `null` quand on réinitialise. */
  onChange: (value: string | null, raw: T | null) => void;
  /** Appelé quand l'utilisateur valide un texte qui ne matche aucun item. */
  onCreate?: (text: string) => void;
  /** Appelé pour effacer la sélection (croix dans le trigger). */
  onClear?: () => void;
  placeholder?: string;
  /** Texte affiché quand la liste filtrée est vide. */
  emptyText?: string;
  /** Autorise la saisie libre (active `onCreate` même si aucun match). */
  allowFreeText?: boolean;
  /** État de chargement (désactive le trigger). */
  loading?: boolean;
  /** Désactive complètement le composant. */
  disabled?: boolean;
  /** Classes Tailwind appliquées au bouton trigger. */
  className?: string;
}

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

export function SearchableSelect<T>({
  items,
  value,
  freeTextLabel,
  onChange,
  onCreate,
  onClear,
  placeholder = "Sélectionner…",
  emptyText = "Aucun résultat",
  allowFreeText = false,
  loading = false,
  disabled = false,
  className,
}: SearchableSelectProps<T>) {
  const [open, setOpen] = useState<boolean>(false);
  const [query, setQuery] = useState<string>("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  const selected = useMemo<SearchableSelectItem<T> | null>(() => {
    if (!value) return null;
    return items.find((item) => item.value === value) ?? null;
  }, [items, value]);

  const filtered = useMemo<SearchableSelectItem<T>[]>(() => {
    const q = normalize(query.trim());
    if (!q) return items;
    return items.filter((item) => {
      const label = normalize(item.label);
      const secondary = item.secondary ? normalize(item.secondary) : "";
      return label.includes(q) || secondary.includes(q);
    });
  }, [items, query]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      return;
    }
    // Focus l'input à l'ouverture sans casser le rendu Radix.
    const id = window.setTimeout(() => inputRef.current?.focus(), 30);
    return () => window.clearTimeout(id);
  }, [open]);

  const handleSelect = (item: SearchableSelectItem<T>) => {
    onChange(item.value, item.raw);
    setOpen(false);
  };

  const handleCreate = () => {
    if (!allowFreeText || !onCreate) return;
    const text = query.trim();
    if (!text) return;
    onCreate(text);
    setOpen(false);
  };

  const handleClear = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (onClear) {
      onClear();
    } else {
      onChange(null, null);
    }
  };

  const triggerLabel = selected?.label ?? freeTextLabel ?? placeholder;
  const hasValue = Boolean(selected) || Boolean(freeTextLabel);

  const showCreateRow =
    allowFreeText &&
    Boolean(onCreate) &&
    query.trim().length > 0 &&
    !filtered.some((item) => normalize(item.label) === normalize(query.trim()));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled || loading}
          className={cn(
            "w-full justify-between bg-black/20 border-white/20 text-white hover:bg-white/10 hover:text-white",
            !hasValue && "text-white/60",
            className,
          )}
        >
          <span className="truncate text-left">
            {loading ? "Chargement…" : triggerLabel}
          </span>
          <span className="ml-2 flex items-center gap-1">
            {hasValue && !disabled && !loading && (
              <button
                type="button"
                onClick={handleClear}
                className="rounded-sm p-0.5 text-white/70 hover:bg-white/10 hover:text-white"
                aria-label="Effacer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-60" />
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[--radix-popover-trigger-width] min-w-[260px] p-0 border-white/15 bg-[rgba(12,18,28,0.96)] backdrop-blur"
      >
        <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2">
          <Search className="h-4 w-4 shrink-0 text-white/50" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && showCreateRow) {
                event.preventDefault();
                handleCreate();
              }
            }}
            placeholder="Rechercher…"
            className="h-8 w-full bg-transparent text-sm text-white placeholder:text-white/40 focus:outline-none"
          />
        </div>
        <div className="max-h-72 overflow-y-auto p-1">
          {filtered.length === 0 && !showCreateRow && (
            <p className="px-3 py-4 text-center text-sm text-white/60">{emptyText}</p>
          )}
          {filtered.map((item) => {
            const isSelected = selected?.value === item.value;
            return (
              <button
                key={item.value}
                type="button"
                onClick={() => handleSelect(item)}
                className={cn(
                  "flex w-full items-start gap-2 rounded-sm px-2 py-2 text-left text-sm transition",
                  isSelected
                    ? "bg-white/15 text-white"
                    : "text-white/85 hover:bg-white/10 hover:text-white",
                )}
              >
                <Check
                  className={cn(
                    "mt-0.5 h-4 w-4 shrink-0",
                    isSelected ? "opacity-100" : "opacity-0",
                  )}
                />
                <span className="flex min-w-0 flex-col">
                  <span className="truncate">{item.label}</span>
                  {item.secondary && (
                    <span className="truncate text-xs text-white/55">{item.secondary}</span>
                  )}
                </span>
              </button>
            );
          })}
          {showCreateRow && (
            <button
              type="button"
              onClick={handleCreate}
              className="flex w-full items-center gap-2 rounded-sm border-t border-white/5 px-2 py-2 text-left text-sm text-emerald-300 hover:bg-emerald-500/10"
            >
              <Plus className="h-4 w-4 shrink-0" />
              <span className="truncate">
                Ajouter « <span className="font-medium text-emerald-200">{query.trim()}</span> »
              </span>
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
