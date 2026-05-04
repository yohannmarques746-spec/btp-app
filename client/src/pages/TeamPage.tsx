import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'wouter';
import { PageWrapper } from '@/components/PageWrapper';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Users, Plus, User, Trash2, Key, Eye, EyeOff,
  Settings2, Loader2, UserCheck, UserX, Mail, Copy, RefreshCw,
  Clock, CheckCircle, Ban, Archive, RotateCcw, AlertTriangle,
} from 'lucide-react';
import { getCsrfToken } from '@/lib/csrf';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { isOwner, OWNERS_LIST } from '@/lib/ownerUtils';

function generatePin(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface Permissions {
  crm: boolean; planning: boolean; devis: boolean; factures: boolean;
  chantiers: boolean; clients: boolean; dashboard: boolean;
}

interface Member {
  id: string;
  name: string;
  email: string | null;
  role: string;
  status: string;
  permissions: Permissions;
  auth_user_id: string | null;
  confirmed_at: string | null;
  created_at: string;
  has_pin: boolean;
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getAuthToken() {
  return supabase.auth.getSession().then(({ data: { session } }) => session?.access_token ?? null);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// ─── Composant permissions ────────────────────────────────────────────────────

function PermissionsEditor({
  permissions, onChange, disabled,
}: { permissions: Permissions; onChange: (p: Permissions) => void; disabled?: boolean }) {
  return (
    <div className="space-y-2">
      {(Object.keys(FEATURE_LABELS) as (keyof Permissions)[]).map((key) => (
        <div key={key} className="flex items-center justify-between py-1">
          <Label className="text-white/80 text-sm">{FEATURE_LABELS[key]}</Label>
          <Switch
            checked={permissions[key] ?? false}
            onCheckedChange={(checked) => onChange({ ...permissions, [key]: checked })}
            disabled={disabled}
          />
        </div>
      ))}
    </div>
  );
}

// ─── Carte membre en attente ──────────────────────────────────────────────────

function PendingMemberCard({ member, ownerId, isPatron, onRefresh }: {
  member: Member; ownerId: string; isPatron: boolean; onRefresh: () => void;
}) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showRefuseConfirm, setShowRefuseConfirm] = useState(false);
  const [role, setRole] = useState('employee');
  const [pin, setPin] = useState('');
  const [permissions, setPermissions] = useState<Permissions>(DEFAULT_PERMISSIONS);
  const [saving, setSaving] = useState(false);
  const [refusing, setRefusing] = useState(false);

  const handleConfirm = async () => {
    const token = await getAuthToken();
    if (!token) return;
    setSaving(true);
    try {
      const csrf = await getCsrfToken();
      const res = await fetch(`/api/team/members/${member.id}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, 'X-CSRF-Token': csrf },
        body: JSON.stringify({ ownerId, role, pin: pin || undefined }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) {
        toast({ title: data.error ?? 'Erreur', variant: 'destructive' });
        return;
      }

      // Sauvegarder les permissions
      await supabase
        .from('team_members')
        .update({ permissions })
        .eq('id', member.id)
        .eq('user_id', ownerId);

      toast({ title: `${member.name} a été approuvé` });
      setShowConfirmModal(false);
      onRefresh();
    } catch {
      toast({ title: 'Erreur réseau', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleRefuse = async () => {
    const token = await getAuthToken();
    if (!token) return;
    setRefusing(true);
    try {
      const csrf = await getCsrfToken();
      const res = await fetch(`/api/team/members/${member.id}/refuse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, 'X-CSRF-Token': csrf },
        body: JSON.stringify({ ownerId }),
      });
      if (!res.ok) { toast({ title: 'Erreur', variant: 'destructive' }); return; }
      toast({ title: `Demande de ${member.name} refusée` });
      setShowRefuseConfirm(false);
      onRefresh();
    } catch {
      toast({ title: 'Erreur réseau', variant: 'destructive' });
    } finally {
      setRefusing(false);
    }
  };

  return (
    <>
      <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
              <User className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <p className="font-medium text-white">{member.name}</p>
              {member.email && <p className="text-xs text-white/50">{member.email}</p>}
              <p className="text-xs text-amber-300/70 mt-0.5">
                <Clock className="w-3 h-3 inline mr-1" />
                Demande reçue le {formatDate(member.created_at)}
              </p>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button size="sm" onClick={() => setShowConfirmModal(true)}
              className="bg-green-500/20 text-green-300 border border-green-500/30 hover:bg-green-500/30 text-xs h-8">
              <CheckCircle className="w-3 h-3 mr-1" />Configurer
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowRefuseConfirm(true)}
              className="text-red-400/70 hover:text-red-400 hover:bg-red-500/10 h-8">
              <UserX className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Modal confirmation */}
      <Dialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
        <DialogContent className="bg-black/30 backdrop-blur-xl border border-white/10 text-white rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Configuration : {member.name}</DialogTitle>
            <DialogDescription className="text-white/50">
              Définissez le rôle et les permissions de cet employé.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-white/80">Rôle</Label>
              <Select value={role} onValueChange={setRole} disabled={!isPatron}>
                <SelectTrigger className="bg-black/20 border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-black/30 backdrop-blur-lg border-white/10 text-white">
                  <SelectItem value="employee">Employé</SelectItem>
                  {isPatron && <SelectItem value="co_owner">Co-patron</SelectItem>}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-white/80">PIN (optionnel — 6 chiffres)</Label>
              <div className="flex gap-2">
                <Input
                  type="text" inputMode="numeric" maxLength={6} value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="Laisser vide = sans PIN"
                  className="bg-black/20 border-white/10 text-white font-mono tracking-widest text-center flex-1"
                />
                <Button type="button" variant="outline" size="icon"
                  onClick={() => setPin(generatePin())}
                  className="text-white border-white/20 hover:bg-white/10 shrink-0"
                  title="Générer">
                  <RefreshCw className="w-4 h-4" />
                </Button>
                <Button type="button" variant="outline" size="icon"
                  onClick={() => { if (pin) navigator.clipboard.writeText(pin); }}
                  disabled={!pin}
                  className="text-white border-white/20 hover:bg-white/10 shrink-0"
                  title="Copier">
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
              {pin && <p className="text-xs text-amber-300/70">Notez le PIN — il ne sera plus visible après enregistrement.</p>}
            </div>

            <div className="space-y-2 border-t border-white/10 pt-3">
              <Label className="text-white/80 text-sm font-medium">Permissions</Label>
              <PermissionsEditor permissions={permissions} onChange={setPermissions} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmModal(false)}
              className="text-white border-white/20 hover:bg-white/10">Annuler</Button>
            <Button onClick={handleConfirm} disabled={saving}
              className="bg-green-500/30 text-green-200 border border-green-500/40 hover:bg-green-500/40">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Approuver'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog refus */}
      <Dialog open={showRefuseConfirm} onOpenChange={setShowRefuseConfirm}>
        <DialogContent className="bg-black/30 backdrop-blur-xl border border-white/10 text-white rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              Refuser la demande ?
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-white/70">La demande de <span className="text-white font-medium">{member.name}</span> sera définitivement refusée.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRefuseConfirm(false)}
              className="text-white border-white/20 hover:bg-white/10">Annuler</Button>
            <Button variant="destructive" onClick={handleRefuse} disabled={refusing}>
              {refusing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Refuser'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Carte membre actif ───────────────────────────────────────────────────────

function ActiveMemberCard({ member, ownerId, isPatron, onRefresh }: {
  member: Member; ownerId: string; isPatron: boolean; onRefresh: () => void;
}) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [showPinDialog, setShowPinDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [savingPin, setSavingPin] = useState(false);
  const [blocking, setBlocking] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [showDeletePwd, setShowDeletePwd] = useState(false);
  const { user } = useAuth();

  const canManage = isPatron || member.role !== 'co_owner';

  const handleUpdatePin = async () => {
    if (!/^\d{6}$/.test(newPin)) {
      toast({ title: 'PIN invalide — 6 chiffres requis', variant: 'destructive' });
      return;
    }
    const token = await getAuthToken();
    if (!token) return;
    setSavingPin(true);
    try {
      const csrf = await getCsrfToken();
      const res = await fetch(`/api/team/members/${member.id}/pin`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, 'X-CSRF-Token': csrf },
        body: JSON.stringify({ pin: newPin, ownerId }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) { toast({ title: data.error ?? 'Erreur', variant: 'destructive' }); return; }
      toast({ title: 'PIN mis à jour' });
      setNewPin('');
      setShowPinDialog(false);
      onRefresh();
    } catch {
      toast({ title: 'Erreur réseau', variant: 'destructive' });
    } finally {
      setSavingPin(false);
    }
  };

  const handleBlock = async () => {
    const token = await getAuthToken();
    if (!token) return;
    setBlocking(true);
    try {
      const csrf = await getCsrfToken();
      await fetch(`/api/team/members/${member.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, 'X-CSRF-Token': csrf },
        body: JSON.stringify({ ownerId, status: 'bloqué' }),
      });
      toast({ title: `${member.name} bloqué` });
      onRefresh();
    } catch {
      toast({ title: 'Erreur réseau', variant: 'destructive' });
    } finally {
      setBlocking(false);
    }
  };

  const handleSoftDelete = async () => {
    const token = await getAuthToken();
    if (!token) return;
    setDeleting(true);
    try {
      const csrf = await getCsrfToken();
      await fetch(`/api/team/members/${member.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, 'X-CSRF-Token': csrf },
        body: JSON.stringify({ ownerId, status: 'supprimé' }),
      });
      toast({ title: `${member.name} archivé` });
      setShowDeleteDialog(false);
      onRefresh();
    } catch {
      toast({ title: 'Erreur réseau', variant: 'destructive' });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <div className={`bg-black/20 border rounded-xl p-4 ${canManage ? 'border-white/10' : 'border-white/5 opacity-70'}`}>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center shrink-0">
              <User className="w-5 h-5 text-white/70" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-medium text-white">{member.name}</p>
                <Badge className={member.role === 'co_owner'
                  ? 'bg-purple-500/20 text-purple-300 text-xs'
                  : 'bg-blue-500/20 text-blue-300 text-xs'}>
                  {member.role === 'co_owner' ? 'Co-patron' : 'Employé'}
                </Badge>
                {member.has_pin && (
                  <Badge className="bg-green-500/10 text-green-400 text-xs">PIN ✓</Badge>
                )}
              </div>
              {member.email && <p className="text-xs text-white/50">{member.email}</p>}
            </div>
          </div>
          {canManage && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <Button size="sm" variant="outline"
                onClick={() => setLocation(`/dashboard/team/permissions/${member.id}`)}
                className="text-white border-white/20 hover:bg-white/10 text-xs h-8">
                <Settings2 className="w-3 h-3 mr-1" />Permissions
              </Button>
              <Button size="sm" variant="outline"
                onClick={() => { setNewPin(''); setShowPinDialog(true); }}
                className="text-white border-white/20 hover:bg-white/10 text-xs h-8">
                <Key className="w-3 h-3 mr-1" />{member.has_pin ? 'PIN' : 'Ajouter PIN'}
              </Button>
              <Button size="sm" variant="ghost"
                onClick={handleBlock} disabled={blocking}
                className="text-amber-400/70 hover:text-amber-400 hover:bg-amber-500/10 h-8">
                {blocking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ban className="w-4 h-4" />}
              </Button>
              <Button size="sm" variant="ghost"
                onClick={() => setShowDeleteDialog(true)}
                className="text-red-400/70 hover:text-red-400 hover:bg-red-500/10 h-8">
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Dialog PIN */}
      <Dialog open={showPinDialog} onOpenChange={setShowPinDialog}>
        <DialogContent className="bg-black/30 backdrop-blur-xl border border-white/10 text-white rounded-2xl">
          <DialogHeader>
            <DialogTitle>{member.has_pin ? 'Modifier le PIN' : 'Assigner un PIN'} — {member.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label className="text-white/80">PIN (6 chiffres)</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  type={showPin ? 'text' : 'password'} inputMode="numeric" maxLength={6} value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="••••••"
                  className="bg-black/20 border-white/10 text-white font-mono tracking-widest text-center text-xl pr-10"
                />
                <button type="button" onClick={() => setShowPin(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white">
                  {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <Button type="button" variant="outline" size="icon"
                onClick={() => setNewPin(generatePin())}
                className="text-white border-white/20 hover:bg-white/10 shrink-0">
                <RefreshCw className="w-4 h-4" />
              </Button>
              <Button type="button" variant="outline" size="icon"
                onClick={() => { navigator.clipboard.writeText(newPin); }}
                disabled={!newPin}
                className="text-white border-white/20 hover:bg-white/10 shrink-0">
                <Copy className="w-4 h-4" />
              </Button>
            </div>
            {newPin && <p className="text-xs text-amber-300/70">Notez le PIN — non récupérable après enregistrement.</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPinDialog(false)}
              className="text-white border-white/20 hover:bg-white/10">Annuler</Button>
            <Button onClick={handleUpdatePin} disabled={savingPin || newPin.length !== 6}>
              {savingPin ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog suppression */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="bg-black/30 backdrop-blur-xl border border-white/10 text-white rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              Archiver {member.name} ?
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-white/70">
            Le compte sera archivé (accès révoqué). Les données créées par ce membre sont conservées.
            Vous pourrez restaurer l'accès depuis l'onglet Archivés.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}
              className="text-white border-white/20 hover:bg-white/10">Annuler</Button>
            <Button variant="destructive" onClick={handleSoftDelete} disabled={deleting}>
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Archiver'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Carte membre bloqué ──────────────────────────────────────────────────────

function BlockedMemberCard({ member, ownerId, isPatron, onRefresh }: {
  member: Member; ownerId: string; isPatron: boolean; onRefresh: () => void;
}) {
  const { toast } = useToast();
  const [restoring, setRestoring] = useState(false);
  const [archiving, setArchiving] = useState(false);

  const canManage = isPatron || member.role !== 'co_owner';

  const setStatus = async (status: string) => {
    const token = await getAuthToken();
    if (!token) return;
    if (status === 'actif') setRestoring(true); else setArchiving(true);
    try {
      const csrf = await getCsrfToken();
      await fetch(`/api/team/members/${member.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, 'X-CSRF-Token': csrf },
        body: JSON.stringify({ ownerId, status }),
      });
      toast({ title: status === 'actif' ? `${member.name} réactivé` : `${member.name} archivé` });
      onRefresh();
    } catch {
      toast({ title: 'Erreur réseau', variant: 'destructive' });
    } finally {
      setRestoring(false);
      setArchiving(false);
    }
  };

  return (
    <div className="bg-black/20 border border-white/5 rounded-xl p-4 opacity-80">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
            <Ban className="w-5 h-5 text-red-400/70" />
          </div>
          <div>
            <p className="font-medium text-white/70 line-through decoration-red-400/50">{member.name}</p>
            {member.email && <p className="text-xs text-white/40">{member.email}</p>}
          </div>
        </div>
        {canManage && (
          <div className="flex gap-2">
            <Button size="sm" variant="outline"
              onClick={() => setStatus('actif')} disabled={restoring}
              className="text-green-300 border-green-500/30 hover:bg-green-500/10 text-xs h-8">
              {restoring ? <Loader2 className="w-3 h-3 animate-spin" /> : <><RotateCcw className="w-3 h-3 mr-1" />Réactiver</>}
            </Button>
            <Button size="sm" variant="ghost"
              onClick={() => setStatus('supprimé')} disabled={archiving}
              className="text-red-400/70 hover:text-red-400 hover:bg-red-500/10 h-8">
              {archiving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Archive className="w-4 h-4" />}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Carte membre archivé ─────────────────────────────────────────────────────

function ArchivedMemberCard({ member, ownerId, isPatron, onRefresh }: {
  member: Member; ownerId: string; isPatron: boolean; onRefresh: () => void;
}) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [restoring, setRestoring] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleRestore = async () => {
    const token = await getAuthToken();
    if (!token) return;
    setRestoring(true);
    try {
      const csrf = await getCsrfToken();
      await fetch(`/api/team/members/${member.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, 'X-CSRF-Token': csrf },
        body: JSON.stringify({ ownerId, status: 'actif' }),
      });
      toast({ title: `${member.name} restauré` });
      onRefresh();
    } catch {
      toast({ title: 'Erreur réseau', variant: 'destructive' });
    } finally {
      setRestoring(false);
    }
  };

  const handleHardDelete = async () => {
    if (!deletePassword || !user?.email) return;
    setDeleting(true);
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: user.email, password: deletePassword,
      });
      if (authError) {
        toast({ title: 'Mot de passe incorrect', variant: 'destructive' });
        setDeleting(false);
        return;
      }
      const token = await getAuthToken();
      if (!token) return;
      const csrf = await getCsrfToken();
      const res = await fetch(`/api/team/members/${member.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, 'X-CSRF-Token': csrf },
        body: JSON.stringify({ ownerId }),
      });
      if (!res.ok) { toast({ title: 'Erreur suppression', variant: 'destructive' }); return; }
      toast({ title: `${member.name} supprimé définitivement` });
      setShowDeleteDialog(false);
      onRefresh();
    } catch {
      toast({ title: 'Erreur réseau', variant: 'destructive' });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <div className="bg-black/10 border border-white/5 rounded-xl p-4 opacity-60">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center shrink-0">
              <User className="w-5 h-5 text-white/30" />
            </div>
            <div>
              <p className="font-medium text-white/50 italic">{member.name}</p>
              {member.email && <p className="text-xs text-white/30">{member.email}</p>}
              <Badge className="bg-gray-500/20 text-gray-400 text-xs mt-1">
                {member.status === 'refusé' ? 'Refusé' : 'Archivé'}
              </Badge>
            </div>
          </div>
          <div className="flex gap-2">
            {member.status !== 'refusé' && (
              <Button size="sm" variant="outline"
                onClick={handleRestore} disabled={restoring}
                className="text-white/70 border-white/20 hover:bg-white/10 text-xs h-8">
                {restoring ? <Loader2 className="w-3 h-3 animate-spin" /> : <><RotateCcw className="w-3 h-3 mr-1" />Restaurer</>}
              </Button>
            )}
            {isPatron && (
              <Button size="sm" variant="ghost"
                onClick={() => { setDeletePassword(''); setShowDeleteDialog(true); }}
                className="text-red-400/50 hover:text-red-400 hover:bg-red-500/10 h-8 text-xs">
                <Trash2 className="w-3 h-3 mr-1" />Supprimer
              </Button>
            )}
          </div>
        </div>
      </div>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="bg-black/30 backdrop-blur-xl border border-white/10 text-white rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              Supprimer définitivement
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-white/70">
              <span className="text-white font-medium">{member.name}</span> sera supprimé de façon irréversible.
              Entrez votre mot de passe pour confirmer.
            </p>
            <div className="relative">
              <Input
                type={showPwd ? 'text' : 'password'} value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                placeholder="Votre mot de passe"
                className="bg-black/20 border-white/10 text-white pr-10"
              />
              <button type="button" onClick={() => setShowPwd(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white">
                {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}
              className="text-white border-white/20 hover:bg-white/10">Annuler</Button>
            <Button variant="destructive" onClick={handleHardDelete} disabled={deleting || !deletePassword}>
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Supprimer définitivement'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
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

  const loadCoOwners = useCallback(async () => {
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
  }, [ownerId]);

  useEffect(() => {
    if (ownerId) loadCoOwners();
  }, [ownerId, loadCoOwners]);

  const handleAdd = async () => {
    if (!newEmail.trim()) return;
    setAdding(true);
    try {
      const token = await getAuthToken();
      if (!token) return;
      const csrf = await getCsrfToken();
      const res = await fetch('/api/team/co-owners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, 'X-CSRF-Token': csrf },
        body: JSON.stringify({ email: newEmail.trim(), ownerId }),
      });
      const data = await res.json() as { error?: string };
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
      const csrf = await getCsrfToken();
      const res = await fetch(`/api/team/co-owners/${coOwnerId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, 'X-CSRF-Token': csrf },
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
      <div className="p-4 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <UserCheck className="h-5 w-5 text-white/70" />
          <span className="font-semibold">Co-patrons</span>
          {!loading && <Badge className="bg-white/10 text-white/70">{coOwners.length}</Badge>}
        </div>
      </div>
      <CardContent className="p-4 space-y-4">
        {loading ? (
          <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-white/50" /></div>
        ) : coOwners.length === 0 ? (
          <p className="text-sm text-white/50 text-center py-2">Aucun co-patron configuré</p>
        ) : (
          <div className="space-y-2">
            {coOwners.map((co) => (
              <div key={co.id} className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-xl">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-white/50" />
                  <span className="text-sm text-white">{co.co_owner_email}</span>
                </div>
                <Button variant="ghost" size="sm"
                  onClick={() => handleRemove(co.co_owner_id)}
                  disabled={removingId === co.co_owner_id}
                  className="text-red-400/70 hover:text-red-400 hover:bg-red-500/10 h-8 w-8 p-0">
                  {removingId === co.co_owner_id ? <Loader2 className="w-3 h-3 animate-spin" /> : <UserX className="w-4 h-4" />}
                </Button>
              </div>
            ))}
          </div>
        )}
        <div className="border-t border-white/10 pt-4 space-y-2">
          <Label className="text-white/70 text-xs">Ajouter un co-patron par email</Label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <Input
                type="email" value={newEmail}
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
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Ajout membre legacy (PIN uniquement) ─────────────────────────────────────

function AddLegacyMemberDialog({ ownerId, onAdded }: { ownerId: string; onAdded: () => void }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [role, setRole] = useState('member');
  const [adding, setAdding] = useState(false);

  const handleAdd = async () => {
    if (!name.trim() || !/^\d{6}$/.test(pin)) {
      toast({ title: 'Nom et PIN (6 chiffres) requis', variant: 'destructive' });
      return;
    }
    const token = await getAuthToken();
    if (!token) { toast({ title: 'Session expirée', variant: 'destructive' }); return; }
    setAdding(true);
    try {
      const csrf = await getCsrfToken();
      const res = await fetch('/api/team/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, 'X-CSRF-Token': csrf },
        body: JSON.stringify({ name: name.trim(), pin, role, ownerId }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) {
        if (res.status === 409) toast({ title: 'Ce PIN est déjà utilisé', variant: 'destructive' });
        else toast({ title: data.error ?? 'Erreur serveur', variant: 'destructive' });
        return;
      }
      toast({ title: `${name} ajouté` });
      setName(''); setPin(''); setRole('member');
      setOpen(false);
      onAdded();
    } catch {
      toast({ title: 'Erreur réseau', variant: 'destructive' });
    } finally {
      setAdding(false);
    }
  };

  return (
    <>
      <Button onClick={() => setOpen(true)}
        className="h-9 px-3 text-xs bg-white/10 text-white border border-white/10 hover:bg-white/20">
        <Plus className="w-3.5 h-3.5 mr-1" />Membre PIN
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-black/30 backdrop-blur-xl border border-white/10 text-white rounded-2xl">
          <DialogHeader>
            <DialogTitle>Nouveau membre (PIN uniquement)</DialogTitle>
            <DialogDescription className="text-white/50">
              Pour les membres sans compte email — ils se connectent via {window.location.origin}/team-members-login
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-white/80">Nom</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Jean Dupont"
                className="bg-black/20 border-white/10 text-white" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-white/80">PIN (6 chiffres)</Label>
              <div className="flex gap-2">
                <Input type="text" inputMode="numeric" maxLength={6} value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="Ex: 482631"
                  className="bg-black/20 border-white/10 text-white font-mono tracking-widest text-center text-xl flex-1" />
                <Button type="button" variant="outline" size="icon"
                  onClick={() => setPin(generatePin())}
                  className="text-white border-white/20 hover:bg-white/10 shrink-0">
                  <RefreshCw className="w-4 h-4" />
                </Button>
                <Button type="button" variant="outline" size="icon"
                  onClick={() => { navigator.clipboard.writeText(pin); toast({ title: 'PIN copié' }); }}
                  disabled={!pin}
                  className="text-white border-white/20 hover:bg-white/10 shrink-0">
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}
              className="text-white border-white/20 hover:bg-white/10">Annuler</Button>
            <Button onClick={handleAdd} disabled={adding}>
              {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Créer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function TeamPage() {
  const { user } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  // Utiliser le premier propriétaire pour gérer les membres
  const ownerId = OWNERS_LIST[0] || user?.id || '';
  // L'utilisateur est patron s'il est dans la liste des propriétaires
  const isPatron = user?.id ? isOwner(user.id) : false;

  const loadMembers = useCallback(async () => {
    if (!ownerId) return;
    setLoading(true);
    const { data } = await supabase
      .from('team_members')
      .select('id, name, email, role, status, permissions, auth_user_id, confirmed_at, created_at, pin_hash')
      .eq('user_id', ownerId)
      .order('created_at', { ascending: false });

    const normalized = ((data ?? []) as Record<string, unknown>[]).map((m) => {
      const { pin_hash, ...rest } = m;
      return { ...rest, has_pin: !!pin_hash } as unknown as Member;
    });

    setMembers(normalized);
    setLoading(false);
  }, [ownerId]);

  useEffect(() => {
    if (ownerId) loadMembers();
  }, [ownerId, loadMembers]);

  const pending = members.filter(m => m.status === 'en_attente_confirmation');
  const active = members.filter(m => m.status === 'actif');
  const blocked = members.filter(m => m.status === 'bloqué');
  const archived = members.filter(m => ['supprimé', 'refusé'].includes(m.status));

  return (
    <PageWrapper mobileTitle="Équipe">
      <header className="bg-black/20 backdrop-blur-xl border-b border-white/10 px-3 py-3 md:px-6 md:py-4 md:rounded-tl-3xl">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-lg font-bold md:text-2xl text-white">Gestion de l'Équipe</h1>
            <p className="text-sm text-white/70">Email + PIN sécurisé · Approbation · Permissions</p>
          </div>
          <AddLegacyMemberDialog ownerId={ownerId} onAdded={loadMembers} />
        </div>
      </header>

      <main className="flex-1 px-3 py-3 md:px-6 md:py-6 space-y-4">
        <Tabs defaultValue="actifs">
          <TabsList className="bg-black/20 border border-white/10 w-full grid grid-cols-4 h-auto p-1 rounded-xl">
            <TabsTrigger value="en_attente" className="rounded-lg text-xs data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-200 relative">
              En attente
              {pending.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-amber-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
                  {pending.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="actifs" className="rounded-lg text-xs data-[state=active]:bg-green-500/20 data-[state=active]:text-green-200">
              Actifs {!loading && <span className="ml-1 opacity-60">({active.length})</span>}
            </TabsTrigger>
            <TabsTrigger value="bloques" className="rounded-lg text-xs data-[state=active]:bg-red-500/20 data-[state=active]:text-red-200">
              Bloqués {!loading && blocked.length > 0 && <span className="ml-1 opacity-60">({blocked.length})</span>}
            </TabsTrigger>
            <TabsTrigger value="archives" className="rounded-lg text-xs data-[state=active]:bg-gray-500/20 data-[state=active]:text-gray-300">
              Archivés
            </TabsTrigger>
          </TabsList>

          {/* En attente */}
          <TabsContent value="en_attente" className="mt-4 space-y-3">
            {loading ? (
              <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-white/50" /></div>
            ) : pending.length === 0 ? (
              <div className="text-center py-12 text-white/40">
                <Clock className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p>Aucune demande en attente</p>
              </div>
            ) : pending.map(m => (
              <PendingMemberCard key={m.id} member={m} ownerId={ownerId} isPatron={isPatron} onRefresh={loadMembers} />
            ))}
          </TabsContent>

          {/* Actifs */}
          <TabsContent value="actifs" className="mt-4 space-y-3">
            {loading ? (
              <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-white/50" /></div>
            ) : active.length === 0 ? (
              <div className="text-center py-12 text-white/40">
                <Users className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p>Aucun membre actif</p>
                <p className="text-xs mt-1">Les membres s'inscrivent via la page de connexion</p>
              </div>
            ) : active.map(m => (
              <ActiveMemberCard key={m.id} member={m} ownerId={ownerId} isPatron={isPatron} onRefresh={loadMembers} />
            ))}
          </TabsContent>

          {/* Bloqués */}
          <TabsContent value="bloques" className="mt-4 space-y-3">
            {loading ? (
              <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-white/50" /></div>
            ) : blocked.length === 0 ? (
              <div className="text-center py-12 text-white/40">
                <Ban className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p>Aucun membre bloqué</p>
              </div>
            ) : blocked.map(m => (
              <BlockedMemberCard key={m.id} member={m} ownerId={ownerId} isPatron={isPatron} onRefresh={loadMembers} />
            ))}
          </TabsContent>

          {/* Archivés */}
          <TabsContent value="archives" className="mt-4 space-y-3">
            {loading ? (
              <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-white/50" /></div>
            ) : archived.length === 0 ? (
              <div className="text-center py-12 text-white/40">
                <Archive className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p>Aucun membre archivé</p>
              </div>
            ) : archived.map(m => (
              <ArchivedMemberCard key={m.id} member={m} ownerId={ownerId} isPatron={isPatron} onRefresh={loadMembers} />
            ))}
          </TabsContent>
        </Tabs>

        {/* Co-patrons — visible pour le patron uniquement */}
        {isPatron && <CoOwnersSection ownerId={ownerId} />}

        {/* Info connexion */}
        <Card className="bg-black/20 backdrop-blur-xl border border-white/10 text-white">
          <CardContent className="p-4 space-y-1">
            <p className="text-sm text-white/70">
              <span className="text-white font-medium">Connexion email :</span>{' '}
              <span className="font-mono text-white/60">
                {typeof window !== 'undefined' ? window.location.origin : ''}/login
              </span>
            </p>
            <p className="text-sm text-white/70">
              <span className="text-white font-medium">Connexion PIN uniquement :</span>{' '}
              <span className="font-mono text-white/60">
                {typeof window !== 'undefined' ? window.location.origin : ''}/team-members-login
              </span>
            </p>
          </CardContent>
        </Card>
      </main>
    </PageWrapper>
  );
}
