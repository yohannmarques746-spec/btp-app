import { PageWrapper } from '@/components/PageWrapper';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Building, Clock, User } from 'lucide-react';
import { useChantiers, Chantier } from '@/context/ChantiersContext';
import { useState, useMemo, useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { useRendezVous } from '@/hooks/useRendezVous';
import { RdvDialog } from '@/components/planning/RdvDialog';
import type { RendezVous } from '@/types/rendezVous';

type DurationUnit = 'j' | 's' | 'm';

function formatDurationLabel(amount: number, unit: DurationUnit): string {
  if (unit === 'm') return `${amount} mois`;
  if (unit === 's') return `${amount} semaine${amount > 1 ? 's' : ''}`;
  return `${amount} jour${amount > 1 ? 's' : ''}`;
}

function parseDurationInput(raw: string): { amount: number; unit: DurationUnit; days: number; label: string } | null {
  const value = raw.toLowerCase().trim();
  const compact = value.replace(/\s+/g, '');

  const compactMatch = compact.match(/^(\d+)([jsm])$/);
  if (compactMatch) {
    const amount = Math.max(1, parseInt(compactMatch[1], 10));
    const unit = compactMatch[2] as DurationUnit;
    const days = unit === 'm' ? amount * 30 : unit === 's' ? amount * 7 : amount;
    return { amount, unit, days, label: formatDurationLabel(amount, unit) };
  }

  const number = parseInt(value.match(/\d+/)?.[0] || '1', 10);
  const amount = Math.max(1, number);

  if (value.includes('mois')) {
    return { amount, unit: 'm', days: amount * 30, label: formatDurationLabel(amount, 'm') };
  }
  if (value.includes('semaine') || value.includes('sem') || value.includes('week') || value.includes('w')) {
    return { amount, unit: 's', days: amount * 7, label: formatDurationLabel(amount, 's') };
  }
  if (value.includes('jour') || value.includes('j')) {
    return { amount, unit: 'j', days: amount, label: formatDurationLabel(amount, 'j') };
  }
  if (/^\d+$/.test(compact)) {
    return { amount, unit: 'j', days: amount, label: formatDurationLabel(amount, 'j') };
  }

  return null;
}

// Fonction pour parser la durée et calculer la date de fin
function calculateEndDate(dateDebut: string, duree: string): Date {
  const startDate = new Date(dateDebut);
  const parsed = parseDurationInput(duree);
  const daysToAdd = parsed?.days ?? 1;
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + daysToAdd);
  return endDate;
}

// Fonction pour obtenir les jours du mois
function getDaysInMonth(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = firstDay.getDay();
  
  const days = [];
  
  // Ajouter les jours du mois précédent pour compléter la première semaine
  const prevMonth = new Date(year, month, 0);
  const prevMonthDays = prevMonth.getDate();
  for (let i = startingDayOfWeek - 1; i >= 0; i--) {
    days.push({
      date: new Date(year, month - 1, prevMonthDays - i),
      isCurrentMonth: false,
      isToday: false
    });
  }
  
  // Ajouter les jours du mois actuel
  const today = new Date();
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    days.push({
      date,
      isCurrentMonth: true,
      isToday: date.toDateString() === today.toDateString()
    });
  }
  
  // Ajouter les jours du mois suivant pour compléter la dernière semaine
  const remainingDays = 42 - days.length; // 6 semaines * 7 jours
  for (let day = 1; day <= remainingDays; day++) {
    days.push({
      date: new Date(year, month + 1, day),
      isCurrentMonth: false,
      isToday: false
    });
  }
  
  return days;
}

function formatDateForInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function buildDurationFromDates(startDate: string, endDate: string): string {
  const start = new Date(startDate);
  const end = new Date(endDate);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  const diffMs = end.getTime() - start.getTime();
  const diffDays = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)));
  return `${diffDays} jours`;
}

function normalizeSearchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export default function PlanningPage() {
  const { chantiers, updateChantier } = useChantiers();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedChantier, setSelectedChantier] = useState<Chantier | null>(null);
  const [selectedDayForAssign, setSelectedDayForAssign] = useState<Date | null>(null);
  const [assignChantierId, setAssignChantierId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [editDateDebut, setEditDateDebut] = useState('');
  const [editDateFin, setEditDateFin] = useState('');
  const [editDureeInput, setEditDureeInput] = useState('');
  const [editStatut, setEditStatut] = useState<Chantier['statut']>('planifié');
  const startDateInputRef = useRef<HTMLInputElement | null>(null);
  const endDateInputRef = useRef<HTMLInputElement | null>(null);

  const { rendezVous, refreshForMonth, createRendezVous, updateRendezVous, deleteRendezVous } = useRendezVous();
  const [rdvDialogOpen, setRdvDialogOpen] = useState(false);
  const [rdvEdit, setRdvEdit] = useState<RendezVous | null>(null);
  const [rdvInitDate, setRdvInitDate] = useState<string>('');

  useEffect(() => {
    void refreshForMonth(currentDate);
  }, [currentDate, refreshForMonth]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  
  // Fonction pour obtenir les chantiers d'un jour donné
  function getChantiersForDay(date: Date) {
    return chantiers.filter(chantier => {
      const startDate = new Date(chantier.dateDebut);
      const endDate = calculateEndDate(chantier.dateDebut, chantier.duree);
      
      // Normaliser les dates (ignorer l'heure)
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);
      
      const chantierStart = new Date(startDate);
      chantierStart.setHours(0, 0, 0, 0);
      const chantierEnd = new Date(endDate);
      chantierEnd.setHours(23, 59, 59, 999);
      
      return dayStart >= chantierStart && dayStart <= chantierEnd;
    });
  }

  const days = useMemo(() => getDaysInMonth(year, month), [year, month]);
  const selectedDayChantiers = useMemo(() => {
    if (!selectedDayForAssign) return [];
    return getChantiersForDay(selectedDayForAssign);
  }, [selectedDayForAssign, chantiers]);

  const filteredAssignableChantiers = useMemo(() => {
    const search = normalizeSearchText(searchTerm);

    return chantiers.filter((chantier) => {
      if (!search) return true;
      return (
        normalizeSearchText(chantier.nom).includes(search) ||
        normalizeSearchText(chantier.clientName).includes(search)
      );
    });
  }, [chantiers, searchTerm]);
  
  const monthNames = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];
  
  const dayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
  
  const goToPreviousMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };
  
  const goToNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };
  
  const goToToday = () => {
    setCurrentDate(new Date());
  };

  useEffect(() => {
    if (!selectedChantier) return;

    const startDate = new Date(selectedChantier.dateDebut);
    const endDate = calculateEndDate(selectedChantier.dateDebut, selectedChantier.duree);
    setEditDateDebut(formatDateForInput(startDate));
    setEditDateFin(formatDateForInput(endDate));
    setEditDureeInput(selectedChantier.duree || '1 jour');
    setEditStatut(selectedChantier.statut);
  }, [selectedChantier]);

  const handleSaveChantier = () => {
    if (!selectedChantier || !editDateDebut || !editDateFin) return;
    if (new Date(editDateFin) < new Date(editDateDebut)) {
      return;
    }

    const parsed = parseDurationInput(editDureeInput);
    const nextDuree = parsed?.label ?? buildDurationFromDates(editDateDebut, editDateFin);
    updateChantier(selectedChantier.id, {
      dateDebut: editDateDebut,
      duree: nextDuree,
      statut: editStatut,
    });

    setSelectedChantier((prev) =>
      prev
        ? {
            ...prev,
            dateDebut: editDateDebut,
            duree: nextDuree,
            statut: editStatut,
          }
        : null
    );
    setSelectedChantier(null);
  };

  const handleAssignDayToChantier = async () => {
    if (!selectedDayForAssign || !assignChantierId) return;
    const { error } = await updateChantier(assignChantierId, {
      dateDebut: formatDateForInput(selectedDayForAssign),
    });

    if (error) {
      toast({
        title: "Erreur lors de l'enregistrement",
        description: error.message,
      });
      return;
    }

    toast({
      title: "Modification enregistrée",
      description: "Le chantier a bien été positionné sur ce jour.",
    });

    setSelectedDayForAssign(null);
    setAssignChantierId('');
    setSearchTerm('');
  };
  
  return (
    <PageWrapper>
      <header className="bg-black/20 backdrop-blur-xl border-b border-white/10 px-6 py-4 rounded-tl-3xl">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-lg font-bold md:text-2xl text-white">
              Planning des Chantiers & Rendez-vous
            </h1>
            <p className="text-sm text-white/70">Calendrier intégré pour organiser vos interventions</p>
          </div>
          <button
            type="button"
            onClick={() => { setRdvEdit(null); setRdvInitDate(''); setRdvDialogOpen(true); }}
            className="text-sm px-3 py-1.5 border border-blue-500 text-blue-500 rounded hover:bg-blue-500/10"
          >
            + Nouveau rendez-vous
          </button>
        </div>
      </header>

      <main className="flex-1 px-3 py-3 md:px-6 md:py-6 space-y-6">
        {/* Contrôles du calendrier */}
        <Card className="bg-black/20 backdrop-blur-xl border border-white/10 text-white">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={goToPreviousMonth}
                  className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <Calendar className="h-5 w-5 rotate-180" />
                </button>
                <h2 className="text-xl font-semibold">
                  {monthNames[month]} {year}
                </h2>
                <button
                  onClick={goToNextMonth}
                  className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <Calendar className="h-5 w-5" />
                </button>
              </div>
              <button
                onClick={goToToday}
                className="px-4 py-2 rounded-lg bg-white/20 backdrop-blur-md text-white hover:bg-white/30 transition-colors text-sm"
              >
                Aujourd'hui
              </button>
            </div>
          </CardHeader>
        </Card>

        {/* Calendrier */}
        <Card className="bg-black/20 backdrop-blur-xl border border-white/10 text-white">
          <CardContent className="p-3 md:p-5">
            {/* En-têtes des jours */}
            <div className="overflow-x-auto -mx-3 px-3 md:mx-0 md:px-0">
              <div className="min-w-[600px] md:min-w-0">
                <div className="grid grid-cols-7 gap-2 mb-4">
              {dayNames.map(day => (
                <div key={day} className="text-center text-sm font-semibold text-white/70 py-2">
                  {day}
                </div>
              ))}
                </div>
            
                {/* Grille du calendrier */}
                <div className="grid grid-cols-7 gap-2">
              {days.map((day, index) => {
                const dayChantiers = getChantiersForDay(day.date);
                const isToday = day.isToday;
                
                return (
                  <div
                    key={index}
                    onClick={() => {
                      if (!day.isCurrentMonth) return;
                      setSelectedDayForAssign(day.date);
                    }}
                    className={`min-h-[100px] p-2 rounded-lg border ${
                      day.isCurrentMonth
                        ? isToday
                          ? 'bg-white/10 border-white/30 border-2'
                          : 'bg-black/10 border-white/10'
                        : 'bg-black/5 border-white/5 opacity-50'
                    } ${day.isCurrentMonth ? 'cursor-pointer hover:bg-white/10 transition-colors' : ''}`}
                  >
                    <div className={`text-sm font-medium mb-1 ${
                      day.isCurrentMonth ? 'text-white' : 'text-white/50'
                    } ${isToday ? 'text-white font-bold' : ''}`}>
                      {day.date.getDate()}
                    </div>
                    
                    {/* Afficher les chantiers */}
                    <div className="space-y-1">
                      {dayChantiers.slice(0, 2).map(chantier => {
                        const startDate = new Date(chantier.dateDebut);
                        const isStart = day.date.toDateString() === startDate.toDateString();
                        const endDate = calculateEndDate(chantier.dateDebut, chantier.duree);
                        const isEnd = day.date.toDateString() === endDate.toDateString();
                        
                        return (
                          <div
                            key={chantier.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedChantier(chantier);
                            }}
                            className={`text-xs p-1 rounded truncate cursor-pointer hover:brightness-110 transition ${
                              chantier.statut === 'planifié'
                                ? 'bg-blue-500/30 text-blue-200 border border-blue-500/50'
                                : chantier.statut === 'en cours'
                                ? 'bg-yellow-500/30 text-yellow-200 border border-yellow-500/50'
                                : 'bg-green-500/30 text-green-200 border border-green-500/50'
                            }`}
                            title={`${chantier.nom} - ${chantier.clientName} (cliquer pour voir)`}
                          >
                            {isStart && '▶ '}
                            {isEnd && '◀ '}
                            {chantier.nom}
                          </div>
                        );
                      })}
                      {dayChantiers.length > 2 && (
                        <div className="text-xs text-white/70">
                          +{dayChantiers.length - 2} autre(s)
                        </div>
                      )}
                      {rendezVous
                        .filter((rdv) => rdv.date === formatDateForInput(day.date))
                        .map((rdv) => (
                          <div
                            key={rdv.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              setRdvEdit(rdv);
                              setRdvInitDate(rdv.date);
                              setRdvDialogOpen(true);
                            }}
                            className="border-l-4 border-blue-500 bg-blue-500/15 text-xs px-1 py-0.5 rounded-sm cursor-pointer truncate text-white"
                          >
                            {rdv.heure_debut.slice(0, 5)} {rdv.titre}
                          </div>
                        ))}
                    </div>
                  </div>
                );
              })}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Légende */}
        <Card className="bg-black/20 backdrop-blur-xl border border-white/10 text-white">
          <CardHeader>
            <CardTitle className="text-lg">Légende</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-blue-500/30 border border-blue-500/50"></div>
                <span className="text-sm">Planifié</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-yellow-500/30 border border-yellow-500/50"></div>
                <span className="text-sm">En cours</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-green-500/30 border border-green-500/50"></div>
                <span className="text-sm">Terminé</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 border-l-2 border-blue-500 bg-blue-500/15 rounded-sm" />
                <span className="text-xs text-gray-400">Rendez-vous</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Liste des chantiers du mois */}
        {chantiers.length > 0 && (
          <Card className="bg-black/20 backdrop-blur-xl border border-white/10 text-white">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Building className="h-5 w-5" />
                Chantiers du mois
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {chantiers
                  .filter(chantier => {
                    const startDate = new Date(chantier.dateDebut);
                    const endDate = calculateEndDate(chantier.dateDebut, chantier.duree);
                    return (
                      (startDate.getMonth() === month && startDate.getFullYear() === year) ||
                      (endDate.getMonth() === month && endDate.getFullYear() === year) ||
                      (startDate <= new Date(year, month + 1, 0) && endDate >= new Date(year, month, 1))
                    );
                  })
                  .map(chantier => {
                    const startDate = new Date(chantier.dateDebut);
                    const endDate = calculateEndDate(chantier.dateDebut, chantier.duree);
                    
                    return (
                      <div
                        key={chantier.id}
                        className="p-3 rounded-lg bg-black/20 border border-white/10"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Building className="h-4 w-4 text-white/70" />
                              <span className="font-semibold">{chantier.nom}</span>
                              <span className={`px-2 py-0.5 rounded text-xs ${
                                chantier.statut === 'planifié'
                                  ? 'bg-blue-500/20 text-blue-300'
                                  : chantier.statut === 'en cours'
                                  ? 'bg-yellow-500/20 text-yellow-300'
                                  : 'bg-green-500/20 text-green-300'
                              }`}>
                                {chantier.statut}
                              </span>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-white/70">
                              <div className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {chantier.clientName}
                              </div>
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {startDate.toLocaleDateString('fr-FR')} - {endDate.toLocaleDateString('fr-FR')}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      <Dialog open={!!selectedChantier} onOpenChange={(open) => !open && setSelectedChantier(null)}>
        <DialogContent className="bg-black/30 backdrop-blur-xl border border-white/10 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white">Détail du chantier</DialogTitle>
          </DialogHeader>
          {selectedChantier && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-black/20 border border-white/10">
                <p className="text-lg font-semibold text-white">{selectedChantier.nom}</p>
                <p className="text-sm text-white/70">Client : {selectedChantier.clientName}</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div
                  className="p-3 rounded-lg bg-black/20 border border-white/10 cursor-pointer"
                  onClick={() => {
                    const input = startDateInputRef.current;
                    if (!input) return;
                    try {
                      input.showPicker?.();
                    } catch {}
                    input.focus();
                  }}
                >
                  <p className="text-xs text-white/60 mb-1">Date de début</p>
                  <Input
                    ref={startDateInputRef}
                    type="date"
                    value={editDateDebut}
                    onChange={(e) => {
                      const nextStart = e.target.value;
                      setEditDateDebut(nextStart);
                      const parsed = parseDurationInput(editDureeInput);
                      if (nextStart && parsed) {
                        const nextEnd = new Date(nextStart);
                        nextEnd.setDate(nextEnd.getDate() + parsed.days);
                        setEditDateFin(formatDateForInput(nextEnd));
                      }
                    }}
                    className="bg-black/20 border-white/10 text-white"
                  />
                </div>
                <div
                  className="p-3 rounded-lg bg-black/20 border border-white/10 cursor-pointer"
                  onClick={() => {
                    const input = endDateInputRef.current;
                    if (!input) return;
                    try {
                      input.showPicker?.();
                    } catch {}
                    input.focus();
                  }}
                >
                  <p className="text-xs text-white/60 mb-1">Date de fin</p>
                  <Input
                    ref={endDateInputRef}
                    type="date"
                    value={editDateFin}
                    onChange={(e) => {
                      const nextEnd = e.target.value;
                      setEditDateFin(nextEnd);
                      if (editDateDebut && nextEnd && new Date(nextEnd) >= new Date(editDateDebut)) {
                        setEditDureeInput(buildDurationFromDates(editDateDebut, nextEnd));
                      }
                    }}
                    className="bg-black/20 border-white/10 text-white"
                  />
                </div>
              </div>
              <div className="p-3 rounded-lg bg-black/20 border border-white/10">
                <p className="text-xs text-white/60 mb-1">Durée</p>
                <Input
                  value={editDureeInput}
                  onChange={(e) => {
                    const value = e.target.value;
                    setEditDureeInput(value);
                    const parsed = parseDurationInput(value);
                    if (editDateDebut && parsed) {
                      const nextEnd = new Date(editDateDebut);
                      nextEnd.setDate(nextEnd.getDate() + parsed.days);
                      setEditDateFin(formatDateForInput(nextEnd));
                    }
                  }}
                  placeholder="Ex: 2j, 2s, 2m"
                  className="bg-black/20 border-white/10 text-white"
                />
                <p className="text-xs text-white/60 mt-2">
                  Exemples : 2j = 2 jours, 2s = 2 semaines, 2m = 2 mois
                </p>
              </div>
              <div className="p-3 rounded-lg bg-black/20 border border-white/10">
                <p className="text-xs text-white/60 mb-1">Statut</p>
                <select
                  value={editStatut}
                  onChange={(e) => setEditStatut(e.target.value as Chantier['statut'])}
                  className="w-full px-3 py-2 rounded-md border bg-black/20 border-white/10 text-white"
                >
                  <option value="planifié">Planifié</option>
                  <option value="en cours">En cours</option>
                  <option value="terminé">Terminé</option>
                </select>
              </div>
              <div className="flex justify-end">
                <Button
                  type="button"
                  onClick={handleSaveChantier}
                  disabled={!editDateDebut || !editDateFin || new Date(editDateFin) < new Date(editDateDebut)}
                  className="bg-white/20 backdrop-blur-md text-white border border-white/10 hover:bg-white/30"
                >
                  Enregistrer les modifications
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedDayForAssign} onOpenChange={(open) => !open && setSelectedDayForAssign(null)}>
        <DialogContent className="bg-black/30 backdrop-blur-xl border border-white/10 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Chantiers du jour</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-white/70">
              Jour sélectionné : {selectedDayForAssign ? selectedDayForAssign.toLocaleDateString('fr-FR') : ''}
            </p>
            <div className="p-3 rounded-lg bg-black/20 border border-white/10">
              <p className="text-xs text-white/60 mb-2">Déjà planifiés ce jour</p>
              {selectedDayChantiers.length === 0 ? (
                <p className="text-sm text-white/70">Aucun chantier prévu.</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {selectedDayChantiers.map((chantier) => (
                    <button
                      key={chantier.id}
                      type="button"
                      onClick={() => {
                        setSelectedDayForAssign(null);
                        setAssignChantierId('');
                        setSearchTerm('');
                        setLocation(`/dashboard/projects?chantierId=${chantier.id}`);
                      }}
                      className="w-full text-left text-sm p-2 rounded bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                    >
                      <p className="font-medium text-white">{chantier.nom}</p>
                      <p className="text-xs text-white/70">{chantier.clientName} - {chantier.statut}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div>
              <p className="text-xs text-white/60 mb-1">Ajouter un chantier à ce jour</p>
              <Select
                value={assignChantierId}
                onValueChange={(value) => setAssignChantierId(value)}
              >
                <SelectTrigger className="w-full bg-black/20 border-white/10 text-white">
                  <SelectValue placeholder="Sélectionner un chantier" />
                </SelectTrigger>
                <SelectContent className="bg-black/20 backdrop-blur-xl border-white/10">
                  <div className="p-2">
                    <Input
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      onKeyDown={(e) => e.stopPropagation()}
                      placeholder="Rechercher un chantier..."
                      className="bg-black/30 border-white/10 text-white placeholder:text-white/50 h-9"
                    />
                  </div>
                  {filteredAssignableChantiers.length > 0 ? (
                    filteredAssignableChantiers.map((chantier) => (
                      <SelectItem key={chantier.id} value={chantier.id} className="text-white">
                        {chantier.nom} - {chantier.clientName}
                      </SelectItem>
                    ))
                  ) : (
                    <div className="px-3 py-2 text-sm text-white/60">Aucun chantier trouvé</div>
                  )}
                </SelectContent>
              </Select>
              {filteredAssignableChantiers.length === 0 && (
                <p className="text-xs text-white/60 mt-2">Aucun chantier disponible pour ce filtre.</p>
              )}
            </div>
            <div className="flex justify-end">
              <Button
                type="button"
                onClick={handleAssignDayToChantier}
                disabled={!assignChantierId || !selectedDayForAssign}
                className="bg-white/20 backdrop-blur-md text-white border border-white/10 hover:bg-white/30"
              >
                Enregistrer ce chantier ce jour-là
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <RdvDialog
        open={rdvDialogOpen}
        onClose={() => { setRdvDialogOpen(false); setRdvEdit(null); }}
        onSave={async (data) => {
          if (rdvEdit) {
            await updateRendezVous({ ...data, id: rdvEdit.id });
          } else {
            await createRendezVous(data);
          }
          await refreshForMonth(currentDate);
        }}
        onDelete={async (id) => {
          await deleteRendezVous(id);
          await refreshForMonth(currentDate);
        }}
        initialDate={rdvInitDate}
        editData={rdvEdit}
        chantiersOptions={chantiers.map((c) => ({ id: c.id, nom: c.nom }))}
      />
    </PageWrapper>
  );
}
