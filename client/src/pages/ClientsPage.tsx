import { PageWrapper } from '@/components/PageWrapper';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { User, Plus, Building, Mail, Phone, Image as ImageIcon, Pencil, FileText } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useChantiers, Client, Chantier } from '@/context/ChantiersContext';
import { formatCHF } from '@/utils/chf';
import type { Devis } from '@/types/devis';
import { useDevis } from '@/hooks/useDevis';
import { useToast } from '@/hooks/use-toast';

const emptyNewClientState = {
  name: '',
  email: '',
  phone: '',
  prenom: '',
  adresse: '',
  npa: '',
  localite: '',
  pays: '',
  notes: '',
};

function formatClientAddressLine(c: Pick<Client, 'adresse' | 'npa' | 'localite'>): string {
  return [c.adresse, c.npa, c.localite].filter(Boolean).join(' ').trim();
}

export default function ClientsPage() {
  const { toast } = useToast();
  const { clients, chantiers, addClient, updateClient, updateChantier } = useChantiers();
  const { devisList } = useDevis();
  const [location] = useLocation();
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isClientEditDialogOpen, setIsClientEditDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [isChantierEditDialogOpen, setIsChantierEditDialogOpen] = useState(false);
  const [editingChantier, setEditingChantier] = useState<Chantier | null>(null);
  const [newClient, setNewClient] = useState({ ...emptyNewClientState });
  const [isSavingClient, setIsSavingClient] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (location === '/dashboard/clients' && params.get('openDialog') === 'true') {
      setSelectedClient(null);
      setIsDialogOpen(true);
      window.history.replaceState({}, '', '/dashboard/clients');
    }
  }, [location]);

  // Filtrer les chantiers du client sélectionné
  const clientChantiers = selectedClient
    ? chantiers.filter(c => c.clientId === selectedClient.id)
    : [];

  const normalize = (value?: string) => (value || '').trim().toLowerCase();
  const normalizePhone = (value?: string) => (value || '').replace(/\D/g, '');

  const clientDevis = selectedClient
    ? devisList.filter((devis) => {
        const sameName = normalize(devis.client.nom) === normalize(selectedClient.name);
        const sameEmail =
          normalize(selectedClient.email).length > 0 &&
          normalize(devis.client.email) === normalize(selectedClient.email);
        const samePhone =
          normalizePhone(selectedClient.phone).length > 0 &&
          normalizePhone(devis.client.telephone) === normalizePhone(selectedClient.phone);
        return sameName || sameEmail || samePhone;
      })
    : [];

  const getDevisStatusClass = (status: Devis['statut']) => {
    if (status === 'accepte') return 'bg-green-500/20 text-green-300';
    if (status === 'envoye') return 'bg-blue-500/20 text-blue-300';
    if (status === 'refuse') return 'bg-red-500/20 text-red-300';
    if (status === 'expire') return 'bg-amber-500/20 text-amber-300';
    return 'bg-gray-500/20 text-gray-300';
  };

  const handleAddClient = async () => {
    if (!newClient.name || !newClient.email || !newClient.phone) return;
    setIsSavingClient(true);

    const client: Client = {
      id: Date.now().toString(),
      ...newClient
    };

    const { error } = await addClient(client);
    setIsSavingClient(false);
    if (error) {
      console.error('ClientsPage.handleAddClient', error);
      toast({ title: "Erreur lors de l'enregistrement", description: error.message });
      return;
    }
    setNewClient({ ...emptyNewClientState });
    setIsDialogOpen(false);
    toast({ title: 'Enregistré avec succès' });
  };

  const handleOpenEditClient = () => {
    if (!selectedClient) return;
    setEditingClient({ ...selectedClient });
    setIsClientEditDialogOpen(true);
  };

  const handleSaveClient = async () => {
    if (!editingClient) return;
    setIsSavingClient(true);
    const { error } = await updateClient(editingClient.id, {
      name: editingClient.name,
      email: editingClient.email,
      phone: editingClient.phone,
      prenom: editingClient.prenom,
      adresse: editingClient.adresse,
      npa: editingClient.npa,
      localite: editingClient.localite,
      pays: editingClient.pays,
      notes: editingClient.notes,
    });
    setIsSavingClient(false);
    if (error) {
      console.error('ClientsPage.handleSaveClient', error);
      toast({ title: "Erreur lors de l'enregistrement", description: error.message });
      return;
    }
    setSelectedClient(editingClient);
    setIsClientEditDialogOpen(false);
    toast({ title: 'Enregistré avec succès' });
  };

  const handleOpenEditChantier = (chantier: Chantier) => {
    setEditingChantier({ ...chantier });
    setIsChantierEditDialogOpen(true);
  };

  const handleSaveChantier = async () => {
    if (!editingChantier) return;
    const { error } = await updateChantier(editingChantier.id, {
      nom: editingChantier.nom,
      dateDebut: editingChantier.dateDebut,
      duree: editingChantier.duree,
      statut: editingChantier.statut,
    });
    if (error) {
      console.error('ClientsPage.handleSaveChantier', error);
      toast({ title: "Erreur lors de l'enregistrement", description: error.message });
      return;
    }
    setIsChantierEditDialogOpen(false);
    toast({ title: 'Enregistré avec succès' });
  };

  return (
    <PageWrapper>
      <header className="bg-black/20 backdrop-blur-xl border-b border-white/10 px-6 py-4 rounded-tl-3xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">
              Clients
            </h1>
            <p className="text-sm text-white/70">
              {selectedClient ? `Chantiers de ${selectedClient.name}` : 'Gérez vos clients et leurs chantiers'}
            </p>
          </div>
          {!selectedClient && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-white/20 backdrop-blur-md text-white border border-white/10 hover:bg-white/30">
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter un Client
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[85vh] overflow-y-auto bg-black/20 backdrop-blur-xl border border-white/10 text-white">
                <DialogHeader>
                  <DialogTitle className="text-white">Nouveau Client</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label className="text-white">Nom</Label>
                    <Input
                      value={newClient.name}
                      onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
                      placeholder="Nom du client"
                      className="bg-black/20 backdrop-blur-md border-white/10 text-white placeholder:text-white/50"
                    />
                  </div>
                  <div>
                    <Label className="text-white">Email</Label>
                    <Input
                      type="email"
                      value={newClient.email}
                      onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                      placeholder="email@example.com"
                      className="bg-black/20 backdrop-blur-md border-white/10 text-white placeholder:text-white/50"
                    />
                  </div>
                  <div>
                    <Label className="text-white">Téléphone</Label>
                    <Input
                      type="tel"
                      value={newClient.phone}
                      onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
                      placeholder="06 12 34 56 78"
                      className="bg-black/20 backdrop-blur-md border-white/10 text-white placeholder:text-white/50"
                    />
                  </div>
                  <div className="space-y-3 border-t border-white/10 pt-4">
                    <p className="text-sm font-medium text-white">Informations complémentaires (facultatif)</p>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      <div className="md:col-span-2">
                        <Label className="text-white">Prénom</Label>
                        <Input
                          value={newClient.prenom}
                          onChange={(e) => setNewClient({ ...newClient, prenom: e.target.value })}
                          placeholder="Prénom ou contact"
                          className="bg-black/20 backdrop-blur-md border-white/10 text-white placeholder:text-white/50"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <Label className="text-white">Adresse</Label>
                        <Input
                          value={newClient.adresse}
                          onChange={(e) => setNewClient({ ...newClient, adresse: e.target.value })}
                          placeholder="Rue et numéro"
                          className="bg-black/20 backdrop-blur-md border-white/10 text-white placeholder:text-white/50"
                        />
                      </div>
                      <div>
                        <Label className="text-white">NPA</Label>
                        <Input
                          value={newClient.npa}
                          onChange={(e) => setNewClient({ ...newClient, npa: e.target.value })}
                          placeholder="Ex. 1000"
                          className="bg-black/20 backdrop-blur-md border-white/10 text-white placeholder:text-white/50"
                        />
                      </div>
                      <div>
                        <Label className="text-white">Ville</Label>
                        <Input
                          value={newClient.localite}
                          onChange={(e) => setNewClient({ ...newClient, localite: e.target.value })}
                          placeholder="Localité"
                          className="bg-black/20 backdrop-blur-md border-white/10 text-white placeholder:text-white/50"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <Label className="text-white">Pays</Label>
                        <Input
                          value={newClient.pays}
                          onChange={(e) => setNewClient({ ...newClient, pays: e.target.value })}
                          placeholder="Ex. Suisse"
                          className="bg-black/20 backdrop-blur-md border-white/10 text-white placeholder:text-white/50"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <Label className="text-white">Notes</Label>
                        <Textarea
                          value={newClient.notes}
                          onChange={(e) => setNewClient({ ...newClient, notes: e.target.value })}
                          placeholder="Remarques internes (facultatif)"
                          rows={2}
                          className="bg-black/20 backdrop-blur-md border-white/10 text-white placeholder:text-white/50"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setIsDialogOpen(false)}
                      className="text-white border-white/20 hover:bg-white/10"
                    >
                      Annuler
                    </Button>
                    <Button
                      onClick={handleAddClient}
                      disabled={isSavingClient}
                      className="bg-white/20 backdrop-blur-md text-white border border-white/10 hover:bg-white/30"
                    >
                      {isSavingClient ? 'Enregistrement...' : 'Ajouter'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
          {selectedClient && (
            <Button
              variant="outline"
              onClick={() => setSelectedClient(null)}
              className="text-white border-white/20 hover:bg-white/10"
            >
              Retour à la liste
            </Button>
          )}
        </div>
      </header>

      <main className="flex-1 p-6">
        {!selectedClient ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {clients.map((client) => (
              <Card
                key={client.id}
                className="bg-black/20 backdrop-blur-xl border border-white/10 text-white hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => setSelectedClient(client)}
              >
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center">
                      <User className="h-6 w-6 text-white/70" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{client.name}</CardTitle>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-white/70">
                    <Mail className="h-4 w-4" />
                    {client.email}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-white/70">
                    <Phone className="h-4 w-4" />
                    {client.phone}
                  </div>
                  <div className="mt-4 pt-4 border-t border-white/10">
                    <div className="flex items-center gap-2 text-sm text-white/70">
                      <Building className="h-4 w-4" />
                      {chantiers.filter(c => c.clientId === client.id).length} chantier(s)
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div>
            <Card className="bg-black/20 backdrop-blur-xl border border-white/10 text-white mb-6">
              <CardHeader>
                <CardTitle className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center">
                    <User className="h-6 w-6 text-white/70" />
                  </div>
                  <div>
                    <div className="text-xl">{selectedClient.name}</div>
                    <div className="text-sm font-normal text-white/70">{selectedClient.email}</div>
                    <div className="text-sm font-normal text-white/70">{selectedClient.phone}</div>
                    {formatClientAddressLine(selectedClient) ? (
                      <div className="text-sm font-normal text-white/70">{formatClientAddressLine(selectedClient)}</div>
                    ) : null}
                  </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleOpenEditClient}
                    className="text-white border-white/20 hover:bg-white/10"
                  >
                    <Pencil className="h-4 w-4 mr-2" />
                    Modifier
                  </Button>
                </CardTitle>
              </CardHeader>
            </Card>

            <h2 className="text-xl font-semibold text-white mb-4">Chantiers de {selectedClient.name}</h2>

            {clientChantiers.length === 0 ? (
              <Card className="bg-black/20 backdrop-blur-xl border border-white/10 text-white">
                <CardContent className="py-12 text-center">
                  <Building className="h-12 w-12 mx-auto mb-4 text-white/50" />
                  <p className="text-white/70">Aucun chantier pour ce client</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {clientChantiers.map((chantier) => (
                  <Card
                    key={chantier.id}
                    className="bg-black/20 backdrop-blur-xl border border-white/10 text-white hover:shadow-lg transition-shadow"
                  >
                    {chantier.images.length > 0 && (
                      <div className="relative h-48 overflow-hidden rounded-t-lg">
                        <img
                          src={chantier.images[0]}
                          alt={chantier.nom}
                          className="w-full h-full object-cover"
                        />
                        {chantier.images.length > 1 && (
                          <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm text-white px-2 py-1 rounded text-xs flex items-center gap-1">
                            <ImageIcon className="h-3 w-3" />
                            {chantier.images.length}
                          </div>
                        )}
                      </div>
                    )}
                    <CardHeader>
                      <div className="flex items-center justify-between gap-2">
                        <CardTitle className="text-lg">{chantier.nom}</CardTitle>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenEditChantier(chantier)}
                          className="text-white border-white/20 hover:bg-white/10"
                        >
                          <Pencil className="h-4 w-4 mr-1" />
                          Modifier
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="text-sm text-white/70">
                        Date: {new Date(chantier.dateDebut).toLocaleDateString('fr-FR')}
                      </div>
                      <div className="text-sm text-white/70">
                        Durée: {chantier.duree}
                      </div>
                      <div className="mt-4">
                        <span className={`px-2 py-1 rounded text-xs ${
                          chantier.statut === 'planifié' ? 'bg-blue-500/20 text-blue-300' :
                          chantier.statut === 'en cours' ? 'bg-green-500/20 text-green-300' :
                          'bg-gray-500/20 text-gray-300'
                        }`}>
                          {chantier.statut}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            <h2 className="text-xl font-semibold text-white mt-8 mb-4">Devis de {selectedClient.name}</h2>
            {clientDevis.length === 0 ? (
              <Card className="bg-black/20 backdrop-blur-xl border border-white/10 text-white">
                <CardContent className="py-12 text-center">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-white/50" />
                  <p className="text-white/70">Aucun devis enregistré pour ce client</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {clientDevis.map((devis) => (
                  <Card
                    key={devis.id}
                    className="bg-black/20 backdrop-blur-xl border border-white/10 text-white hover:shadow-lg transition-shadow"
                  >
                    <CardHeader>
                      <div className="flex items-center justify-between gap-2">
                        <CardTitle className="text-lg">{devis.numero}</CardTitle>
                        <span className={`px-2 py-1 rounded text-xs ${getDevisStatusClass(devis.statut)}`}>
                          {devis.statut}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm text-white/80">
                      <div>Objet: {devis.objet || 'Sans objet'}</div>
                      <div>Date: {new Date(devis.dateEmission).toLocaleDateString('fr-FR')}</div>
                      <div>Expiration: {new Date(devis.dateExpiration).toLocaleDateString('fr-FR')}</div>
                      <div className="font-semibold text-white">Total TTC: {formatCHF(devis.totalTTC)}</div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      <Dialog open={isClientEditDialogOpen} onOpenChange={setIsClientEditDialogOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto bg-black/20 backdrop-blur-xl border border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Modifier le client</DialogTitle>
          </DialogHeader>
          {editingClient && (
            <div className="space-y-4">
              <div>
                <Label className="text-white">Nom</Label>
                <Input
                  value={editingClient.name}
                  onChange={(e) => setEditingClient({ ...editingClient, name: e.target.value })}
                  className="bg-black/20 backdrop-blur-md border-white/10 text-white"
                />
              </div>
              <div>
                <Label className="text-white">Email</Label>
                <Input
                  type="email"
                  value={editingClient.email}
                  onChange={(e) => setEditingClient({ ...editingClient, email: e.target.value })}
                  className="bg-black/20 backdrop-blur-md border-white/10 text-white"
                />
              </div>
              <div>
                <Label className="text-white">Téléphone</Label>
                <Input
                  value={editingClient.phone}
                  onChange={(e) => setEditingClient({ ...editingClient, phone: e.target.value })}
                  className="bg-black/20 backdrop-blur-md border-white/10 text-white"
                />
              </div>
              <div className="space-y-3 border-t border-white/10 pt-4">
                <p className="text-sm font-medium text-white">Informations complémentaires (facultatif)</p>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <Label className="text-white">Prénom</Label>
                    <Input
                      value={editingClient.prenom ?? ''}
                      onChange={(e) => setEditingClient({ ...editingClient, prenom: e.target.value })}
                      placeholder="Prénom ou contact"
                      className="bg-black/20 backdrop-blur-md border-white/10 text-white placeholder:text-white/50"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label className="text-white">Adresse</Label>
                    <Input
                      value={editingClient.adresse ?? ''}
                      onChange={(e) => setEditingClient({ ...editingClient, adresse: e.target.value })}
                      placeholder="Rue et numéro"
                      className="bg-black/20 backdrop-blur-md border-white/10 text-white placeholder:text-white/50"
                    />
                  </div>
                  <div>
                    <Label className="text-white">NPA</Label>
                    <Input
                      value={editingClient.npa ?? ''}
                      onChange={(e) => setEditingClient({ ...editingClient, npa: e.target.value })}
                      placeholder="Ex. 1000"
                      className="bg-black/20 backdrop-blur-md border-white/10 text-white placeholder:text-white/50"
                    />
                  </div>
                  <div>
                    <Label className="text-white">Ville</Label>
                    <Input
                      value={editingClient.localite ?? ''}
                      onChange={(e) => setEditingClient({ ...editingClient, localite: e.target.value })}
                      placeholder="Localité"
                      className="bg-black/20 backdrop-blur-md border-white/10 text-white placeholder:text-white/50"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label className="text-white">Pays</Label>
                    <Input
                      value={editingClient.pays ?? ''}
                      onChange={(e) => setEditingClient({ ...editingClient, pays: e.target.value })}
                      placeholder="Ex. Suisse"
                      className="bg-black/20 backdrop-blur-md border-white/10 text-white placeholder:text-white/50"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label className="text-white">Notes</Label>
                    <Textarea
                      value={editingClient.notes ?? ''}
                      onChange={(e) => setEditingClient({ ...editingClient, notes: e.target.value })}
                      placeholder="Remarques internes (facultatif)"
                      rows={2}
                      className="bg-black/20 backdrop-blur-md border-white/10 text-white placeholder:text-white/50"
                    />
                  </div>
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={handleSaveClient} disabled={isSavingClient} className="bg-white/20 border border-white/10 hover:bg-white/30">
                  {isSavingClient ? 'Enregistrement...' : 'Enregistrer'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isChantierEditDialogOpen} onOpenChange={setIsChantierEditDialogOpen}>
        <DialogContent className="bg-black/20 backdrop-blur-xl border border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Modifier le chantier</DialogTitle>
          </DialogHeader>
          {editingChantier && (
            <div className="space-y-4">
              <div>
                <Label className="text-white">Nom du chantier</Label>
                <Input
                  value={editingChantier.nom}
                  onChange={(e) => setEditingChantier({ ...editingChantier, nom: e.target.value })}
                  className="bg-black/20 backdrop-blur-md border-white/10 text-white"
                />
              </div>
              <div>
                <Label className="text-white">Date de début</Label>
                <Input
                  type="date"
                  value={editingChantier.dateDebut}
                  onChange={(e) => setEditingChantier({ ...editingChantier, dateDebut: e.target.value })}
                  className="bg-black/20 backdrop-blur-md border-white/10 text-white"
                />
              </div>
              <div>
                <Label className="text-white">Durée</Label>
                <Input
                  value={editingChantier.duree}
                  onChange={(e) => setEditingChantier({ ...editingChantier, duree: e.target.value })}
                  className="bg-black/20 backdrop-blur-md border-white/10 text-white"
                />
              </div>
              <div>
                <Label className="text-white">Statut</Label>
                <select
                  value={editingChantier.statut}
                  onChange={(e) => setEditingChantier({ ...editingChantier, statut: e.target.value as Chantier['statut'] })}
                  className="w-full px-3 py-2 rounded-md border bg-black/20 border-white/10 text-white"
                >
                  <option value="planifié">Planifié</option>
                  <option value="en cours">En cours</option>
                  <option value="terminé">Terminé</option>
                </select>
              </div>
              <div className="flex justify-end">
                <Button onClick={handleSaveChantier} className="bg-white/20 border border-white/10 hover:bg-white/30">
                  Enregistrer
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </PageWrapper>
  );
}

