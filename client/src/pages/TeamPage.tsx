import { useState, useEffect } from 'react';
import { PageWrapper } from '@/components/PageWrapper';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Users, Plus, User, Trash2, Building, Key, Eye, EyeOff,
  Settings2, ChevronDown, ChevronUp, Loader2, UserCheck, UserX, Mail,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useChantiers } from '@/hooks/useChantiers';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';

// OWNER_ID canonical — utilisé par les deux patrons
const OWNER_ID = (import.meta.env.VITE_OWNER_ID as string | undefined) ?? '';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Permissions {
  crm: boolean; planning: boolean; devis: boolean; factures: boolean;
  chantiers: boolean; clients: boolean; dashboard: boolean;
}

interface Member {
  id: string; name: string; role: string; status: string;
  permissions: Permissions; user_id: string;
}

interface CoOwner {
  id: string; co_owner_id: string; co_owner_email: string; created_at: string;
}

const DEFAULT_PERMISSIONS: Permissions = {
  crm: false, planning: false, devis: false, factures: false,
  chantiers: false, clients: false, dashboard: false,
};

const FEATURE_LABELS: Record<keyof Permissions, string> = {
  crm: 'CRM', planning: 'Planning', devis: 'Devis', factures: 'Factures',
  chantiers: 'Chantiers', clients: 'Clients', dashboard: 'Dashboard',
};

// ─── Composant toggle permissions ────────────────────────────────────────────

function PermissionsEditor({
  permissions, onChange,
}: { permissions: Permissions; onChange: (p: Permissions) => void }) {
  return (
    <div className="space-y-2">
      {(Object.keys(FEATURE_LABELS) as (keyof Permissions)[]).map((key) => (
        <div key={key} className="flex items-center justify-between py-1">
          <Label className="text-white/80 text-sm">{FEATURE_LABELS[key]}</Label>
          <Switch
            checked={permissions[key]}
            onCheckedChange={(checked) => onChange({ ...permissions, [key]: checked })}
          />
        </div>
      ))}
    </div>
  );
}

// ─── Composant assignation chantiers ─────────────────────────────────────────

function ChantierAssignments({ memberId }: { memberId: string }) {
  const { chantiers } = useChantiers();
  const [assigned, setAssigned] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    supabase
      .from('chantier_assignments')
      .select('chantier_id')
      .eq('member_id', memberId)
      .then(({ data, error }) => {
        if (error) { toast({ title: 'Erreur chargement assignments', variant: 'destructive' }); return; }
        if (data) setAssigned(new Set(data.map((r: { chantier_id: string }) => r.chantier_id)));
      });
  }, [memberId]);

  const toggle = async (chantierId: string) => {
    setSaving(chantierId);
    const isAssigned = assigned.has(chantierId);
    try {
      if (isAssigned) {
        await supabase.from('chantier_assignments').delete().eq('member_id', memberId).eq('chantier_id', chantierId);
        setAssigned((prev) => { const next = new Set(prev); next.delete(chantierId); return next; });
      } else {
        await supabase.from('chantier_assignments').insert({ member_id: memberId, chantier_id: chantierId });
        setAssigned((prev) => new Set([...prev, chantierId]));
      }
    } catch {
      toast({ title: 'Erreur de mise à jour', variant: 'destructive' });
    } finally {
      setSaving(null);
    }
  };

  if (chantiers.length === 0) return <p className="text-sm text-white/50">Aucun chantier disponible.</p>;

  return (
    <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
      {chantiers.map((c) => (
        <label key={c.id} className="flex items-center gap-3 cursor-pointer group">
          <input
            type="checkbox"
            checked={assigned.has(c.id)}
            onChange={() => toggle(c.id)}
            disabled={saving === c.id}
            className="accent-white w-4 h-4"
          />
          <span className="text-sm text-white/80 group-hover:text-white transition-colors flex-1">{c.nom}</span>
          {saving === c.id && <Loader2 className="w-3 h-3 animate-spin text-white/50" />}
        </label>
      ))}
    </div>
  );
}

// ─── Carte membre ─────────────────────────────────────────────────────────────

function MemberCard({ member, onDeleted }: { member: Member; onDeleted: () => void }) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [expanded, setExpanded] = useState(false);
  const [permissions, setPermissions] = useState<Permissions>(
    member.permissions ?? DEFAULT_PERMISSIONS
  );
  const [savingPerms, setSavingPerms] = useState(false);

  const [showPinDialog, setShowPinDialog] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [savingPin, setSavingPin] = useState(false);

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [showDeletePwd, setShowDeletePwd] = useState(false);

  const savePermissions = async (updated: Permissions) => {
    setPermissions(updated);
    setSavingPerms(true);
    try {
      const { error } = await supabase
        .from('team_members')
        .update({ permissions: updated })
        .eq('id', member.id)
        .eq('user_id', OWNER_ID || member.user_id);
      if (error) throw error;
    } catch {
      toast({ title: 'Erreur sauvegarde permissions', variant: 'destructive' });
    } finally {
      setSavingPerms(false);
    }
  };

  const handleUpdatePin = async () => {
    if (!/^\d{4}$/.test(newPin)) {
      toast({ title: 'PIN invalide', description: '4 chiffres requis', variant: 'destructive' });
      return;
    }
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) { toast({ title: 'Session expirée', variant: 'destructive' }); return; }
    setSavingPin(true);
    try {
      const res = await fetch(`/api/team/members/${member.id}/pin`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ pin: newPin, ownerId: OWNER_ID || member.user_id }),
      });
      const data = await res.json();
      if (!res.ok) { toast({ title: data.error ?? 'Erreur', variant: 'destructive' }); return; }
      toast({ title: 'PIN mis à jour' });
      setNewPin('');
      setShowPinDialog(false);
    } catch {
      toast({ title: 'Erreur réseau', variant: 'destructive' });
    } finally {
      setSavingPin(false);
    }
  };

  const handleDelete = async () => {
    if (!deletePassword || !user?.email) return;
    setDeleting(true);
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: user.email, password: deletePassword,
      });
      if (authError) {
        toast({ title: 'Mot de passe incorrect, suppression annulée', variant: 'destructive' });
        setDeleting(false);
        return;
      }
      const { error } = await supabase
        .from('team_members')
        .delete()
        .eq('id', member.id)
        .eq('user_id', OWNER_ID || member.user_id);
      if (error) throw error;
      toast({ title: 'Membre supprimé' });
      setShowDeleteDialog(false);
      onDeleted();
    } catch {
      toast({ title: 'Erreur lors de la suppression', variant: 'destructive' });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="bg-black/20 backdrop-blur-md border border-white/10 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center shrink-0">
            <User className="w-5 h-5 text-white/70" />
          </div>
          <div>
            <p className="font-medium text-white">{member.name}</p>
            <p className="text-xs text-white/60">{member.role === 'co_owner' ? 'Co-patron (PIN)' : 'Membre'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={member.status === 'actif' ? 'bg-green-500/20 text-green-300' : 'bg-gray-500/20 text-gray-300'}>
            {member.status === 'actif' ? 'Actif' : 'Inactif'}
          </Badge>
          <Button variant="ghost" size="sm" onClick={() => setExpanded((v) => !v)}
            className="text-white/60 hover:text-white hover:bg-white/10">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
          <Button variant="ghost" size="sm"
            onClick={() => { setDeletePassword(''); setShowDeleteDialog(true); }}
            className="text-red-400/70 hover:text-red-400 hover:bg-red-500/10">
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-white/10 p-4 space-y-6">
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-white/80 flex items-center gap-1.5">
                <Settings2 className="w-4 h-4" />Permissions
              </p>
              {savingPerms && <Loader2 className="w-3 h-3 animate-spin text-white/50" />}
            </div>
            <PermissionsEditor permissions={permissions} onChange={savePermissions} />
          </div>

          <div>
            <p className="text-sm font-medium text-white/80 flex items-center gap-1.5 mb-3">
              <Building className="w-4 h-4" />Chantiers assignés
            </p>
            <ChantierAssignments memberId={member.id} />
          </div>

          <div>
            <p className="text-sm font-medium text-white/80 flex items-center gap-1.5 mb-2">
              <Key className="w-4 h-4" />Code PIN
            </p>
            <Button size="sm" variant="outline" onClick={() => setShowPinDialog(true)}
              className="text-white border-white/20 hover:bg-white/10">
              Modifier le PIN
            </Button>
          </div>
        </div>
      )}

      {/* Dialog modification PIN */}
      <Dialog open={showPinDialog} onOpenChange={setShowPinDialog}>
        <DialogContent className="bg-black/30 backdrop-blur-xl border border-white/10 text-white rounded-2xl">
          <DialogHeader><DialogTitle>Modifier le PIN — {member.name}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <Label className="text-white/80">Nouveau PIN (4 chiffres)</Label>
            <Input
              type="password" inputMode="numeric" maxLength={4} value={newPin}
              onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="••••"
              className="bg-black/20 border-white/10 text-white font-mono tracking-widest text-center text-xl"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPinDialog(false)}
              className="text-white border-white/20 hover:bg-white/10">Annuler</Button>
            <Button onClick={handleUpdatePin} disabled={savingPin || newPin.length !== 4}>
              {savingPin ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog suppression */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="bg-black/30 backdrop-blur-xl border border-white/10 text-white rounded-2xl">
          <DialogHeader><DialogTitle>Supprimer {member.name} ?</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-white/70">
              Ressaisissez votre mot de passe pour confirmer. Les chantiers ne seront pas affectés.
            </p>
            <div className="relative">
              <Input
                type={showDeletePwd ? 'text' : 'password'} value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                placeholder="Votre mot de passe"
                className="bg-black/20 border-white/10 text-white pr-10"
              />
              <button type="button" onClick={() => setShowDeletePwd((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white">
                {showDeletePwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}
              className="text-white border-white/20 hover:bg-white/10">Annuler</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting || !deletePassword}>
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Supprimer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Section co-patrons ───────────────────────────────────────────────────────

function CoOwnersSection({ ownerId }: { ownerId: string }) {
  const { toast } = useToast();
  const [coOwners, setCoOwners] = useState<CoOwner[]>([]);
  const [loading, setLoading] = useState(true);
  const [newEmail, setNewEmail] = useState('');
  const [adding, setAdding] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const getAuthToken = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  };

  const loadCoOwners = async () => {
    const token = await getAuthToken();
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/team/co-owners?ownerId=${ownerId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setCoOwners(await res.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (ownerId) loadCoOwners();
  }, [ownerId]);

  const handleAdd = async () => {
    if (!newEmail.trim()) return;
    setAdding(true);
    try {
      const token = await getAuthToken();
      if (!token) return;
      const res = await fetch('/api/team/co-owners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ email: newEmail.trim(), ownerId }),
      });
      const data = await res.json();
      if (!res.ok) { toast({ title: data.error ?? 'Erreur', variant: 'destructive' }); return; }
      toast({ title: 'Co-patron ajouté' });
      setNewEmail('');
      await loadCoOwners();
    } catch {
      toast({ title: 'Erreur réseau', variant: 'destructive' });
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (coOwnerId: string) => {
    setRemovingId(coOwnerId);
    try {
      const token = await getAuthToken();
      if (!token) return;
      const res = await fetch(`/api/team/co-owners/${coOwnerId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ownerId }),
      });
      if (!res.ok) { toast({ title: 'Erreur suppression', variant: 'destructive' }); return; }
      toast({ title: 'Co-patron retiré' });
      await loadCoOwners();
    } catch {
      toast({ title: 'Erreur réseau', variant: 'destructive' });
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <Card className="bg-black/20 backdrop-blur-xl border border-white/10 text-white">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserCheck className="h-5 w-5 text-white/70" />
          Co-patrons
          {!loading && <Badge className="ml-1 bg-white/10 text-white/70">{coOwners.length}</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Liste co-patrons */}
        {loading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="w-5 h-5 animate-spin text-white/50" />
          </div>
        ) : coOwners.length === 0 ? (
          <p className="text-sm text-white/50 text-center py-2">Aucun co-patron configuré</p>
        ) : (
          <div className="space-y-2">
            {coOwners.map((co) => (
              <div key={co.id}
                className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-xl">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-white/50" />
                  <span className="text-sm text-white">{co.co_owner_email}</span>
                </div>
                <Button variant="ghost" size="sm"
                  onClick={() => handleRemove(co.co_owner_id)}
                  disabled={removingId === co.co_owner_id}
                  className="text-red-400/70 hover:text-red-400 hover:bg-red-500/10 h-8 w-8 p-0">
                  {removingId === co.co_owner_id
                    ? <Loader2 className="w-3 h-3 animate-spin" />
                    : <UserX className="w-4 h-4" />}
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Ajouter un co-patron */}
        <div className="border-t border-white/10 pt-4 space-y-2">
          <Label className="text-white/70 text-xs">Ajouter un co-patron par email CALDY</Label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <Input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                placeholder="email@exemple.com"
                className="pl-9 bg-black/20 border-white/10 text-white placeholder:text-white/40"
              />
            </div>
            <Button onClick={handleAdd} disabled={adding || !newEmail.trim()}
              className="bg-white/20 text-white border border-white/10 hover:bg-white/30 disabled:opacity-40">
              {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            </Button>
          </div>
          <p className="text-xs text-white/40">
            L'utilisateur doit avoir un compte CALDY existant. Il se connecte via la page de connexion principale.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function TeamPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);

  const [newName, setNewName] = useState('');
  const [newPin, setNewPin] = useState('');
  const [newRole, setNewRole] = useState('member');
  const [adding, setAdding] = useState(false);

  // ownerId = toujours le propriétaire principal (VITE_OWNER_ID) pour que les
  // co-patrons voient et gèrent la même équipe
  const ownerId = OWNER_ID || user?.id || '';

  const loadMembers = async () => {
    if (!ownerId) return;
    setLoading(true);
    const { data } = await supabase
      .from('team_members')
      .select('id, name, role, status, permissions, user_id')
      .eq('user_id', ownerId)
      .order('created_at', { ascending: false });
    setMembers((data as Member[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    if (ownerId) loadMembers();
  }, [ownerId]);

  const getAuthToken = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  };

  const handleAddMember = async () => {
    if (!newName.trim()) { toast({ title: 'Nom requis', variant: 'destructive' }); return; }
    if (!/^\d{4}$/.test(newPin)) {
      toast({ title: 'PIN invalide', description: '4 chiffres exactement', variant: 'destructive' });
      return;
    }

    const token = await getAuthToken();
    if (!token) { toast({ title: 'Session expirée', variant: 'destructive' }); return; }

    setAdding(true);
    try {
      const res = await fetch('/api/team/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: newName.trim(), pin: newPin, role: newRole, ownerId }),
      });
      const data = await res.json();
      if (!res.ok) { toast({ title: data.error ?? 'Erreur', variant: 'destructive' }); return; }
      toast({ title: `${newName} ajouté avec succès` });
      setNewName(''); setNewPin(''); setNewRole('member');
      setIsAddOpen(false);
      await loadMembers();
    } catch {
      toast({ title: 'Erreur réseau', variant: 'destructive' });
    } finally {
      setAdding(false);
    }
  };

  return (
    <PageWrapper mobileTitle="Équipe">
      <header className="bg-black/20 backdrop-blur-xl border-b border-white/10 px-3 py-3 md:px-6 md:py-4 md:rounded-tl-3xl">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-lg font-bold md:text-2xl text-white">Gestion de l'Équipe</h1>
            <p className="text-sm text-white/70">PIN sécurisé • Permissions par module • Assignation chantiers</p>
          </div>
          <Button
            onClick={() => setIsAddOpen(true)}
            className="h-11 px-3 sm:px-4 text-sm bg-white/20 backdrop-blur-md text-white border border-white/10 hover:bg-white/30"
          >
            <Plus className="h-4 w-4 sm:mr-2" /><span className="hidden sm:inline">Ajouter un membre</span>
          </Button>
        </div>
      </header>

      <main className="flex-1 px-3 py-3 md:px-6 md:py-6 space-y-4">
        {/* Membres */}
        <Card className="bg-black/20 backdrop-blur-xl border border-white/10 text-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-white/70" />
              Membres de l'équipe
              {!loading && <Badge className="ml-1 bg-white/10 text-white/70">{members.length}</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="w-6 h-6 animate-spin text-white/50" />
              </div>
            ) : members.length === 0 ? (
              <div className="text-center py-10">
                <Users className="w-12 h-12 mx-auto mb-3 text-white/30" />
                <p className="text-white/60">Aucun membre</p>
                <p className="text-sm text-white/40 mt-1">Ajoutez votre premier membre d'équipe</p>
              </div>
            ) : (
              members.map((m) => (
                <MemberCard key={m.id} member={m} onDeleted={loadMembers} />
              ))
            )}
          </CardContent>
        </Card>

        {/* Co-patrons */}
        <CoOwnersSection ownerId={ownerId} />

        {/* Lien connexion */}
        <Card className="bg-black/20 backdrop-blur-xl border border-white/10 text-white">
          <CardContent className="p-4">
            <p className="text-sm text-white/70">
              <span className="font-medium text-white">Lien de connexion membres :</span>{' '}
              <span className="font-mono text-white/60">
                {typeof window !== 'undefined' ? window.location.origin : ''}/team-members-login
              </span>
            </p>
            <p className="text-xs text-white/40 mt-1">
              Partagez ce lien avec vos membres. Ils se connectent avec leur PIN à 4 chiffres.
            </p>
          </CardContent>
        </Card>
      </main>

      {/* Dialog ajout membre */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="bg-black/30 backdrop-blur-xl border border-white/10 text-white rounded-2xl">
          <DialogHeader><DialogTitle>Nouveau membre</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-white/80">Nom complet</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Jean Dupont"
                className="bg-black/20 border-white/10 text-white" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-white/80">PIN (4 chiffres)</Label>
              <Input
                type="password" inputMode="numeric" maxLength={4} value={newPin}
                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="••••"
                className="bg-black/20 border-white/10 text-white font-mono tracking-widest text-center text-xl"
              />
              <p className="text-xs text-white/40">Le PIN sera haché — non récupérable. Notez-le avant d'enregistrer.</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-white/80">Rôle</Label>
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger className="bg-black/20 border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-black/30 backdrop-blur-lg border-white/10 text-white">
                  <SelectItem value="member">Membre</SelectItem>
                  <SelectItem value="co_owner">Co-patron (PIN)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-white/40">
              Toutes les permissions sont désactivées par défaut. Activez-les depuis la fiche membre après création.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddOpen(false)}
              className="text-white border-white/20 hover:bg-white/10">Annuler</Button>
            <Button onClick={handleAddMember} disabled={adding}>
              {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Créer le membre'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageWrapper>
  );
}
