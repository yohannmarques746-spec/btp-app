import { PageWrapper } from '@/components/PageWrapper';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Calendar, Building, Clock, User } from 'lucide-react';
import { useChantiers, Chantier } from '@/context/ChantiersContext';
import { useState, useMemo, useEffect, useRef } from 'react';

// Fonction pour parser la durée et calculer la date de fin
function calculateEndDate(dateDebut: string, duree: string): Date {
  const startDate = new Date(dateDebut);
  const dureeLower = duree.toLowerCase().trim();
  
  // Parser différentes formats de durée
  let daysToAdd = 0;
  
  if (dureeLower.includes('semaine') || dureeLower.includes('sem') || dureeLower.includes('w')) {
    const weeks = parseInt(dureeLower.match(/\d+/)?.[0] || '1');
    daysToAdd = weeks * 7;
  } else if (dureeLower.includes('mois')) {
    const months = parseInt(dureeLower.match(/\d+/)?.[0] || '1');
    daysToAdd = months * 30; // Approximation
  } else if (dureeLower.includes('jour') || dureeLower.includes('j')) {
    const days = parseInt(dureeLower.match(/\d+/)?.[0] || '1');
    daysToAdd = days;
  } else {
    // Si c'est juste un nombre, on assume des jours
    const days = parseInt(dureeLower.match(/\d+/)?.[0] || '1');
    daysToAdd = days;
  }
  
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

export default function PlanningPage() {
  const { chantiers, updateChantier } = useChantiers();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedChantier, setSelectedChantier] = useState<Chantier | null>(null);
  const [selectedDayForAssign, setSelectedDayForAssign] = useState<Date | null>(null);
  const [assignChantierId, setAssignChantierId] = useState('');
  const [editDateDebut, setEditDateDebut] = useState('');
  const [editDateFin, setEditDateFin] = useState('');
  const [editStatut, setEditStatut] = useState<Chantier['statut']>('planifié');
  const startDateInputRef = useRef<HTMLInputElement | null>(null);
  const endDateInputRef = useRef<HTMLInputElement | null>(null);
  
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  
  const days = useMemo(() => getDaysInMonth(year, month), [year, month]);
  
  // Fonction pour obtenir les chantiers d'un jour donné
  const getChantiersForDay = (date: Date) => {
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
  };
  
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
    setEditStatut(selectedChantier.statut);
  }, [selectedChantier]);

  const handleSaveChantier = () => {
    if (!selectedChantier || !editDateDebut || !editDateFin) return;
    if (new Date(editDateFin) < new Date(editDateDebut)) {
      return;
    }

    const nextDuree = buildDurationFromDates(editDateDebut, editDateFin);
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

  const handleAssignDayToChantier = () => {
    if (!selectedDayForAssign || !assignChantierId) return;
    updateChantier(assignChantierId, {
      dateDebut: formatDateForInput(selectedDayForAssign),
    });
    setSelectedDayForAssign(null);
    setAssignChantierId('');
  };
  
  return (
    <PageWrapper>
      <header className="bg-black/20 backdrop-blur-xl border-b border-white/10 px-6 py-4 rounded-tl-3xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">
              Planning des Chantiers
            </h1>
            <p className="text-sm text-white/70">Calendrier intégré pour organiser vos interventions</p>
          </div>
        </div>
      </header>

      <main className="flex-1 p-6 space-y-6">
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
          <CardContent className="p-6">
            {/* En-têtes des jours */}
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
                    </div>
                  </div>
                );
              })}
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
                    onChange={(e) => setEditDateDebut(e.target.value)}
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
                    onChange={(e) => setEditDateFin(e.target.value)}
                    className="bg-black/20 border-white/10 text-white"
                  />
                </div>
              </div>
              <div className="p-3 rounded-lg bg-black/20 border border-white/10">
                <p className="text-xs text-white/60 mb-1">Durée</p>
                <p className="text-sm font-medium">{buildDurationFromDates(editDateDebut, editDateFin)}</p>
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
            <DialogTitle className="text-white">Associer un chantier</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-white/70">
              Jour sélectionné : {selectedDayForAssign ? selectedDayForAssign.toLocaleDateString('fr-FR') : ''}
            </p>
            <div>
              <p className="text-xs text-white/60 mb-1">Choisir un chantier</p>
              <select
                value={assignChantierId}
                onChange={(e) => setAssignChantierId(e.target.value)}
                className="w-full px-3 py-2 rounded-md border bg-black/20 border-white/10 text-white"
              >
                <option value="">Sélectionner un chantier</option>
                {chantiers.map((chantier) => (
                  <option key={chantier.id} value={chantier.id}>
                    {chantier.nom} - {chantier.clientName}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-end">
              <Button
                onClick={handleAssignDayToChantier}
                disabled={!assignChantierId || !selectedDayForAssign}
                className="bg-white/20 backdrop-blur-md text-white border border-white/10 hover:bg-white/30"
              >
                Associer au jour
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </PageWrapper>
  );
}
