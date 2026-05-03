import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { PageWrapper } from '@/components/PageWrapper';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Loader2, ArrowLeft, Save, User } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';

const OWNER_ID = (import.meta.env.VITE_OWNER_ID as string | undefined) ?? '';

interface Permissions {
  crm: boolean;
  planning: boolean;
  devis: boolean;
  factures: boolean;
  chantiers: boolean;
  clients: boolean;
  dashboard: boolean;
}

const DEFAULT_PERMISSIONS: Permissions = {
  crm: false, planning: false, devis: false, factures: false,
  chantiers: false, clients: false, dashboard: false,
};

const GROUPS = [
  {
    label: 'Tableau de bord',
    keys: [{ key: 'dashboard', label: 'Accès au dashboard' }],
  },
  {
    label: 'Chantiers',
    keys: [{ key: 'chantiers', label: 'Accès aux chantiers' }],
  },
  {
    label: 'Devis',
    keys: [{ key: 'devis', label: 'Accès aux devis' }],
  },
  {
    label: 'Factures',
    keys: [{ key: 'factures', label: 'Accès aux factures' }],
  },
  {
    label: 'Planning',
    keys: [{ key: 'planning', label: 'Accès au planning' }],
  },
  {
    label: 'Clients & CRM',
    keys: [
      { key: 'clients', label: 'Accès aux clients' },
      { key: 'crm', label: 'Accès au CRM' },
    ],
  },
] as const;

interface TeamPermissionsPageProps {
  memberId: string;
}

export default function TeamPermissionsPage({ memberId }: TeamPermissionsPageProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [memberName, setMemberName] = useState('');
  const [memberEmail, setMemberEmail] = useState('');
  const [memberRole, setMemberRole] = useState('');
  const [permissions, setPermissions] = useState<Permissions>(DEFAULT_PERMISSIONS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const ownerId = OWNER_ID || user?.id || '';

  useEffect(() => {
    if (!memberId || !ownerId) return;
    setLoading(true);

    supabase
      .from('team_members')
      .select('id, name, email, role, permissions')
      .eq('id', memberId)
      .eq('user_id', ownerId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error || !data) {
          toast({ title: 'Membre introuvable', variant: 'destructive' });
          setLocation('/dashboard/team');
          return;
        }
        setMemberName((data as any).name ?? '');
        setMemberEmail((data as any).email ?? '');
        setMemberRole((data as any).role ?? '');

        const rawPerms = (data as any).permissions ?? {};
        const merged: Permissions = { ...DEFAULT_PERMISSIONS };
        for (const key of Object.keys(DEFAULT_PERMISSIONS) as (keyof Permissions)[]) {
          if (typeof rawPerms[key] === 'boolean') {
            merged[key] = rawPerms[key];
          }
        }
        setPermissions(merged);
        setLoading(false);
      });
  }, [memberId, ownerId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('team_members')
        .update({ permissions })
        .eq('id', memberId)
        .eq('user_id', ownerId);

      if (error) {
        toast({ title: 'Erreur sauvegarde', variant: 'destructive' });
        return;
      }
      toast({ title: 'Permissions enregistrées' });
      setLocation('/dashboard/team');
    } catch {
      toast({ title: 'Erreur réseau', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const toggle = (key: keyof Permissions, value: boolean) => {
    setPermissions(p => ({ ...p, [key]: value }));
  };

  if (loading) {
    return (
      <PageWrapper mobileTitle="Permissions">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-white/50" />
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper mobileTitle="Permissions">
      <header className="bg-black/20 backdrop-blur-xl border-b border-white/10 px-3 py-3 md:px-6 md:py-4 md:rounded-tl-3xl">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setLocation('/dashboard/team')}
            className="text-white/60 hover:text-white hover:bg-white/10 h-9 w-9 p-0">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-lg font-bold text-white">Permissions — {memberName}</h1>
            <p className="text-sm text-white/60">
              {memberRole === 'co_owner' ? 'Co-patron' : 'Employé'}
              {memberEmail && ` · ${memberEmail}`}
            </p>
          </div>
        </div>
      </header>

      <main className="flex-1 px-3 py-4 md:px-6 md:py-6">
        <div className="max-w-lg space-y-4">
          {GROUPS.map((group) => (
            <div key={group.label} className="bg-black/20 backdrop-blur-xl border border-white/10 rounded-xl p-4 space-y-3">
              <p className="text-sm font-semibold text-white/70 uppercase tracking-wide text-xs">
                {group.label}
              </p>
              {group.keys.map(({ key, label }) => (
                <div key={key} className="flex items-center justify-between">
                  <Label className="text-white/80 text-sm cursor-pointer" htmlFor={`perm-${key}`}>
                    {label}
                  </Label>
                  <Switch
                    id={`perm-${key}`}
                    checked={permissions[key as keyof Permissions] ?? false}
                    onCheckedChange={(v) => toggle(key as keyof Permissions, v)}
                  />
                </div>
              ))}
            </div>
          ))}

          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={() => setLocation('/dashboard/team')}
              className="flex-1 text-white border-white/20 hover:bg-white/10">
              Annuler
            </Button>
            <Button onClick={handleSave} disabled={saving}
              className="flex-1 bg-fuchsia-500/30 text-fuchsia-200 border border-fuchsia-500/40 hover:bg-fuchsia-500/40">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4 mr-2" />Enregistrer</>}
            </Button>
          </div>
        </div>
      </main>
    </PageWrapper>
  );
}
