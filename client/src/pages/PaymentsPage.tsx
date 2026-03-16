import { PageWrapper } from '@/components/PageWrapper';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Euro, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useFactures, type FactureStatus } from '@/hooks/useFactures';
import { useToast } from '@/hooks/use-toast';

export default function PaymentsPage() {
  const { toast } = useToast();
  const { factures, loading, saveFacture, deleteFacture } = useFactures();
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({
    numero: '',
    dateEmission: '',
    dateEcheance: '',
    statut: 'non_payee' as FactureStatus,
    montantHT: '',
    montantTVA: '',
    montantTTC: '',
  });

  const handleSave = async () => {
    if (!form.numero.trim()) return;
    setIsSaving(true);
    const { error } = await saveFacture({
      numero: form.numero.trim(),
      dateEmission: form.dateEmission || undefined,
      dateEcheance: form.dateEcheance || undefined,
      statut: form.statut,
      lignes: [],
      tvaTaux: 8.1,
      montantHT: Number(form.montantHT || 0),
      montantTVA: Number(form.montantTVA || 0),
      montantTTC: Number(form.montantTTC || 0),
    });
    setIsSaving(false);

    if (error) {
      console.error('PaymentsPage.saveFacture', error);
      toast({ title: "Erreur lors de l'enregistrement", description: error.message });
      return;
    }
    toast({ title: 'Enregistré avec succès' });
    setForm({
      numero: '',
      dateEmission: '',
      dateEcheance: '',
      statut: 'non_payee',
      montantHT: '',
      montantTVA: '',
      montantTTC: '',
    });
  };

  return (
    <PageWrapper>
      <header className="bg-black/20 backdrop-blur-xl border-b border-white/10 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">
              Suivi des Paiements
            </h1>
            <p className="text-sm text-white/70">Facturation et gestion de trésorerie</p>
          </div>
        </div>
      </header>

      <main className="flex-1 p-6 space-y-6">
        <Card className="bg-black/20 backdrop-blur-xl border border-white/10 text-white">
          <CardHeader>
            <CardTitle className="text-xl text-white flex items-center gap-2">
              <Euro className="h-5 w-5 text-green-500" />
              Nouvelle facture
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Numéro</Label>
              <Input value={form.numero} onChange={(e) => setForm({ ...form, numero: e.target.value })} className="bg-black/20 border-white/10" />
            </div>
            <div>
              <Label>Statut</Label>
              <select
                value={form.statut}
                onChange={(e) => setForm({ ...form, statut: e.target.value as FactureStatus })}
                className="w-full h-9 rounded-md border bg-black/20 border-white/10 text-white px-3"
              >
                <option value="non_payee">Non payée</option>
                <option value="payee">Payée</option>
                <option value="en_retard">En retard</option>
              </select>
            </div>
            <div>
              <Label>Date émission</Label>
              <Input type="date" value={form.dateEmission} onChange={(e) => setForm({ ...form, dateEmission: e.target.value })} className="bg-black/20 border-white/10" />
            </div>
            <div>
              <Label>Date échéance</Label>
              <Input type="date" value={form.dateEcheance} onChange={(e) => setForm({ ...form, dateEcheance: e.target.value })} className="bg-black/20 border-white/10" />
            </div>
            <div>
              <Label>Montant HT</Label>
              <Input type="number" value={form.montantHT} onChange={(e) => setForm({ ...form, montantHT: e.target.value })} className="bg-black/20 border-white/10" />
            </div>
            <div>
              <Label>Montant TVA</Label>
              <Input type="number" value={form.montantTVA} onChange={(e) => setForm({ ...form, montantTVA: e.target.value })} className="bg-black/20 border-white/10" />
            </div>
            <div>
              <Label>Montant TTC</Label>
              <Input type="number" value={form.montantTTC} onChange={(e) => setForm({ ...form, montantTTC: e.target.value })} className="bg-black/20 border-white/10" />
            </div>
            <div className="md:col-span-2">
              <Button onClick={handleSave} disabled={isSaving}>
                <Plus className="h-4 w-4 mr-2" />
                {isSaving ? 'Enregistrement...' : 'Enregistrer'}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-black/20 backdrop-blur-xl border border-white/10 text-white">
          <CardHeader>
            <CardTitle>Factures</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <p className="text-white/70">Chargement...</p>
            ) : factures.length === 0 ? (
              <p className="text-white/70">Aucune facture enregistrée.</p>
            ) : (
              factures.map((facture) => (
                <div key={facture.id} className="rounded-lg border border-white/10 bg-black/20 p-3 flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{facture.numero}</p>
                    <p className="text-sm text-white/70">{facture.statut} • {facture.montantTTC.toFixed(2)} CHF</p>
                  </div>
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={() => void deleteFacture(facture.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </main>
    </PageWrapper>
  );
}