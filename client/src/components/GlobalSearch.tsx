import { useCallback, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { Search, X, FileText, Building, User, Euro } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useChantiers } from "@/context/ChantiersContext";
import { useFactures } from "@/hooks/useFactures";
import { useDevis } from "@/hooks/useDevis";

interface SearchResult {
  id: string;
  label: string;
  sub: string;
  type: "client" | "chantier" | "devis" | "facture";
  path: string;
}

const TYPE_ICON = {
  client: User,
  chantier: Building,
  devis: FileText,
  facture: Euro,
};

const TYPE_COLOR = {
  client: "text-blue-400",
  chantier: "text-green-400",
  devis: "text-yellow-300",
  facture: "text-emerald-400",
};

export function GlobalSearch() {
  const [, setLocation] = useLocation();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const { clients, chantiers } = useChantiers();
  const { factures } = useFactures();
  const { devisList } = useDevis();

  const results = useMemo<SearchResult[]>(() => {
    const q = query.toLowerCase().trim();
    if (q.length < 2) return [];

    const items: SearchResult[] = [];

    for (const c of clients) {
      if (c.name.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q)) {
        items.push({ id: c.id, label: c.name, sub: c.email ?? "", type: "client", path: `/dashboard/clients` });
      }
    }

    for (const ch of chantiers) {
      if (ch.nom.toLowerCase().includes(q) || ch.clientName?.toLowerCase().includes(q)) {
        items.push({ id: ch.id, label: ch.nom, sub: ch.clientName ?? "", type: "chantier", path: `/dashboard/projects?chantierId=${ch.id}` });
      }
    }

    for (const d of devisList) {
      if (d.numero.toLowerCase().includes(q) || d.client.nom.toLowerCase().includes(q) || d.objet.toLowerCase().includes(q)) {
        items.push({ id: d.id, label: d.numero, sub: d.client.nom, type: "devis", path: `/dashboard/quotes?quoteRef=${encodeURIComponent(d.numero)}` });
      }
    }

    for (const f of factures) {
      if (f.numero.toLowerCase().includes(q)) {
        items.push({ id: f.id, label: f.numero, sub: `${f.montantTTC.toFixed(2)} CHF`, type: "facture", path: `/dashboard/payments?factureRef=${encodeURIComponent(f.numero)}` });
      }
    }

    return items.slice(0, 8);
  }, [query, clients, chantiers, devisList, factures]);

  const goTo = useCallback(
    (path: string) => {
      setLocation(path);
      setQuery("");
      setOpen(false);
    },
    [setLocation]
  );

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/40" />
        <Input
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Rechercher..."
          className="h-8 pl-8 pr-7 bg-white/5 border-white/10 text-white text-xs placeholder:text-white/40 focus:bg-white/10"
        />
        {query && (
          <button
            type="button"
            onClick={() => { setQuery(""); setOpen(false); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {open && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 rounded-lg border border-white/10 bg-black/90 backdrop-blur-xl shadow-xl overflow-hidden">
          {results.map((r) => {
            const Icon = TYPE_ICON[r.type];
            return (
              <button
                key={`${r.type}-${r.id}`}
                type="button"
                className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-sm hover:bg-white/10 transition-colors"
                onClick={() => goTo(r.path)}
              >
                <Icon className={`h-3.5 w-3.5 shrink-0 ${TYPE_COLOR[r.type]}`} />
                <div className="min-w-0 flex-1">
                  <p className="text-white text-xs font-medium truncate">{r.label}</p>
                  <p className="text-white/50 text-[10px] truncate">{r.sub}</p>
                </div>
                <span className="text-[10px] text-white/30 uppercase">{r.type}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
