import { useMemo, useState } from "react";
import { PageWrapper } from "@/components/PageWrapper";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Mail, Workflow, UserPlus, Search } from "lucide-react";
import { CRMPipeline } from "@/components/CRMPipeline";
import { useChantiers } from "@/context/ChantiersContext";
import { useCrmPipeline } from "@/hooks/useCrmPipeline";
import { useDevis } from "@/hooks/useDevis";
import { useFactures } from "@/hooks/useFactures";
import { useToast } from "@/hooks/use-toast";

export default function CRMPipelinePage() {
  const { toast } = useToast();
  const { clients, chantiers } = useChantiers();
  const { devisList } = useDevis();
  const { factures } = useFactures();

  const {
    columns,
    setColumns,
    pendingSendContext,
    setPendingSendContext,
    addProspectFromClient,
  } = useCrmPipeline();

  const [addClientOpen, setAddClientOpen] = useState(false);
  const [clientSearch, setClientSearch] = useState("");

  const filteredClients = useMemo(() => {
    const q = clientSearch.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.phone.replace(/\D/g, "").includes(q.replace(/\D/g, "")) ||
        (c.localite && c.localite.toLowerCase().includes(q)),
    );
  }, [clients, clientSearch]);

  const handleAddClientRow = (client: (typeof clients)[0]) => {
    const result = addProspectFromClient(client);
    if (!result.ok && result.reason === "duplicate") {
      toast({
        title: "Déjà dans le pipeline",
        description: "Ce client est déjà dans « Tous les prospects ».",
        variant: "destructive",
      });
      return;
    }
    setAddClientOpen(false);
    setClientSearch("");
    toast({ title: "Client ajouté au CRM", description: client.name });
  };

  return (
    <PageWrapper mobileTitle="CRM Pipeline">
      <header className="bg-black/20 backdrop-blur-xl border-b border-white/10 px-3 py-3 md:px-6 md:py-4 md:rounded-tl-3xl">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-lg font-bold md:text-2xl text-white">CRM Pipeline</h1>
            <p className="text-sm text-white/70">
              Gérez vos prospects et automatisez vos workflows
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              className="h-11 min-w-[44px] px-4 text-sm touch-manipulation bg-white/20 backdrop-blur-md text-white border border-white/10 hover:bg-white/30"
              onClick={() => setAddClientOpen(true)}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Ajouter un client
            </Button>
            <Button className="h-11 min-w-[44px] px-4 text-sm touch-manipulation bg-white/20 backdrop-blur-md text-white border border-white/10 hover:bg-white/30">
              <Mail className="h-4 w-4 mr-2" />
              Connecter Email
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 px-3 py-3 md:px-6 md:py-6 space-y-6">
        <Card className="bg-black/20 backdrop-blur-xl border border-white/10 text-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Workflow className="h-5 w-5 text-white/70" />
              Configuration Email
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-white/70 mb-4">
              Connectez votre email professionnel pour activer les automatisations et recevoir les
              prospects directement dans votre pipeline.
            </p>
            <Button
              variant="outline"
              className="h-11 min-w-[44px] px-4 text-sm touch-manipulation w-full text-white border-white/20 hover:bg-white/10"
            >
              <Mail className="h-4 w-4 mr-2" />
              Connecter Gmail / Outlook
            </Button>
          </CardContent>
        </Card>

        <CRMPipeline
          columns={columns}
          setColumns={setColumns}
          pendingSendContext={pendingSendContext}
          setPendingSendContext={setPendingSendContext}
          chantiers={chantiers}
          devisList={devisList}
          factures={factures}
        />
      </main>

      <Dialog open={addClientOpen} onOpenChange={setAddClientOpen}>
        <DialogContent className="bg-zinc-950 border-white/10 text-white max-w-lg max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Ajouter un client au pipeline</DialogTitle>
            <p className="text-sm text-white/70">
              Recherchez un client enregistré dans l’app et ajoutez-le à « Tous les prospects ».
            </p>
          </DialogHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
            <Input
              placeholder="Nom, email, téléphone, localité…"
              className="pl-9 bg-black/30 border-white/10 text-white placeholder:text-white/40"
              value={clientSearch}
              onChange={(e) => setClientSearch(e.target.value)}
            />
          </div>
          <ul className="space-y-1 overflow-y-auto max-h-[50vh] pr-1">
            {filteredClients.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => handleAddClientRow(c)}
                  className="w-full text-left rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm hover:bg-white/10 transition-colors"
                >
                  <span className="font-medium text-white">{c.name}</span>
                  <span className="block text-xs text-white/60">{c.email}</span>
                </button>
              </li>
            ))}
            {filteredClients.length === 0 && (
              <li className="text-sm text-white/50 py-6 text-center">Aucun client trouvé.</li>
            )}
          </ul>
        </DialogContent>
      </Dialog>
    </PageWrapper>
  );
}
