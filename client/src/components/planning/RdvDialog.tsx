import { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import type { RendezVous, RendezVousInsert, RdvStatut } from '@/types/rendezVous';

interface RdvDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: RendezVousInsert) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  initialDate?: string;       // YYYY-MM-DD
  editData?: RendezVous | null;
  chantiersOptions: { id: string; nom: string }[];
}

const STATUTS: RdvStatut[] = ['planifié', 'confirmé', 'annulé', 'terminé'];

export function RdvDialog({
  open, onClose, onSave, onDelete, initialDate, editData, chantiersOptions
}: RdvDialogProps) {
  const [titre, setTitre] = useState('');
  const [date, setDate] = useState(initialDate ?? '');
  const [heureDebut, setHeureDebut] = useState('09:00');
  const [heureFin, setHeureFin] = useState('');
  const [chantierId, setChantierId] = useState<string>('');
  const [description, setDescription] = useState('');
  const [statut, setStatut] = useState<RdvStatut>('planifié');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (editData) {
      setTitre(editData.titre);
      setDate(editData.date);
      setHeureDebut(editData.heure_debut);
      setHeureFin(editData.heure_fin ?? '');
      setChantierId(editData.chantier_id ?? '');
      setDescription(editData.description ?? '');
      setStatut(editData.statut);
    } else {
      setTitre(''); setDate(initialDate ?? ''); setHeureDebut('09:00');
      setHeureFin(''); setChantierId(''); setDescription(''); setStatut('planifié');
    }
    setError(null);
  }, [editData, initialDate, open]);

  const handleSave = async () => {
    if (!titre.trim() || !date || !heureDebut) {
      setError('Titre, date et heure de début sont requis.');
      return;
    }
    setSaving(true);
    try {
      await onSave({
        titre: titre.trim(),
        date,
        heure_debut: heureDebut,
        heure_fin: heureFin || null,
        chantier_id: chantierId || null,
        description: description || null,
        statut,
      });
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editData || !onDelete) return;
    setSaving(true);
    try { await onDelete(editData.id); onClose(); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : 'Erreur suppression'); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editData ? 'Modifier le rendez-vous' : 'Nouveau rendez-vous'}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3 py-2">
          {error && <p className="text-sm text-red-500">{error}</p>}
          <input className="border rounded px-3 py-2 text-sm" placeholder="Titre *" value={titre} onChange={e => setTitre(e.target.value)} />
          <input className="border rounded px-3 py-2 text-sm" type="date" value={date} onChange={e => setDate(e.target.value)} />
          <div className="flex gap-2">
            <input className="border rounded px-3 py-2 text-sm flex-1" type="time" value={heureDebut} onChange={e => setHeureDebut(e.target.value)} />
            <input className="border rounded px-3 py-2 text-sm flex-1" type="time" placeholder="Fin (optionnel)" value={heureFin} onChange={e => setHeureFin(e.target.value)} />
          </div>
          <select className="border rounded px-3 py-2 text-sm" value={chantierId} onChange={e => setChantierId(e.target.value)}>
            <option value="">— Aucun chantier —</option>
            {chantiersOptions.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
          </select>
          <select className="border rounded px-3 py-2 text-sm" value={statut} onChange={e => setStatut(e.target.value as RdvStatut)}>
            {STATUTS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <textarea className="border rounded px-3 py-2 text-sm" rows={2} placeholder="Description" value={description} onChange={e => setDescription(e.target.value)} />
        </div>
        <DialogFooter className="flex gap-2 justify-between">
          {editData && onDelete && (
            <button type="button" onClick={handleDelete} disabled={saving} className="text-sm text-red-500 hover:underline">
              Supprimer
            </button>
          )}
          <div className="flex gap-2 ml-auto">
            <button type="button" onClick={onClose} className="text-sm px-4 py-2 border rounded">Annuler</button>
            <button type="button" onClick={handleSave} disabled={saving} className="text-sm px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
