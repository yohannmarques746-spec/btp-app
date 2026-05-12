import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Users, Loader2, Phone, Mail, MapPin, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface TeamClient {
  id: string;
  nom: string;
  prenom: string | null;
  email: string | null;
  telephone: string | null;
  adresse: string | null;
  npa: string | null;
  localite: string | null;
  pays: string | null;
  notes: string | null;
}

function ClientCard({ client }: { client: TeamClient }) {
  const fullName = [client.prenom, client.nom].filter(Boolean).join(" ");
  const address = [client.adresse, client.npa, client.localite].filter(Boolean).join(", ");

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 bg-black/20 backdrop-blur-md border border-white/10 rounded-xl space-y-2"
    >
      <p className="font-semibold text-white">{fullName}</p>
      {address && (
        <div className="flex items-center gap-1.5 text-xs text-white/50">
          <MapPin className="w-3 h-3 shrink-0" />
          {address}
        </div>
      )}
      <div className="flex flex-wrap gap-3">
        {client.telephone && (
          <a
            href={`tel:${client.telephone}`}
            className="flex items-center gap-1.5 text-xs text-blue-300 hover:text-blue-200"
          >
            <Phone className="w-3 h-3" />
            {client.telephone}
          </a>
        )}
        {client.email && (
          <a
            href={`mailto:${client.email}`}
            className="flex items-center gap-1.5 text-xs text-blue-300 hover:text-blue-200"
          >
            <Mail className="w-3 h-3" />
            {client.email}
          </a>
        )}
      </div>
      {client.notes && (
        <p className="text-xs text-white/40 italic">{client.notes}</p>
      )}
    </motion.div>
  );
}

export default function EmployeeClients() {
  const [clients, setClients] = useState<TeamClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchClients = useCallback(async () => {
    const token = localStorage.getItem("member-session-token") ?? "";
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch("/api/team/data/clients", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setClients(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchClients(); }, [fetchClients]);

  const filtered = clients.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.nom.toLowerCase().includes(q) ||
      (c.prenom ?? "").toLowerCase().includes(q) ||
      (c.email ?? "").toLowerCase().includes(q) ||
      (c.telephone ?? "").includes(q) ||
      (c.localite ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-bold text-white">Clients</h1>
        <p className="text-white/60 text-sm">
          {loading ? "Chargement…" : `${clients.length} client${clients.length !== 1 ? "s" : ""}`}
        </p>
      </div>

      <Card className="bg-black/20 backdrop-blur-xl border border-white/10 text-white">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="w-4 h-4 text-white/70" />
            Carnet clients
            {loading && <Loader2 className="w-3 h-3 animate-spin text-white/40 ml-auto" />}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {!loading && clients.length > 0 && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher un client…"
                className="pl-9 bg-black/20 border-white/10 text-white placeholder:text-white/40 text-sm"
              />
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-white/40" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8 text-white/50">
              <Users className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">
                {search ? "Aucun résultat pour cette recherche" : "Aucun client disponible"}
              </p>
            </div>
          ) : (
            filtered.map((c) => <ClientCard key={c.id} client={c} />)
          )}
        </CardContent>
      </Card>
    </div>
  );
}
