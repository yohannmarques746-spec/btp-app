import { useEffect, useMemo, useRef } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Sidebar from '@/components/Sidebar'
import { MobileHeader } from '@/components/MobileHeader'
import {
  AlertTriangle,
  Building,
  Clock,
  FileText,
  Users,
  Euro,
  TrendingUp,
  Plus,
  Calendar,
  Settings
} from 'lucide-react'
import { useLocation } from 'wouter'
import { useChantiers } from '@/context/ChantiersContext'
import { useFactures } from '@/hooks/useFactures'
import { useDevis } from '@/hooks/useDevis'
import { formatCHF } from '@/utils/chf'

export default function Dashboard() {
  const [location, setLocation] = useLocation();
  const mainContainerRef = useRef<HTMLDivElement | null>(null);
  const mainContentRef = useRef<HTMLElement | null>(null);

  // Vérifier si l'utilisateur est un membre d'équipe et rediriger
  useEffect(() => {
    const userType = localStorage.getItem('userType')
    if (userType === 'team') {
      setLocation('/team-dashboard')
    }
  }, [setLocation])

  useEffect(() => {
    const runId = `run-${Date.now()}`;
    const mainRect = mainContainerRef.current?.getBoundingClientRect();
    const contentRect = mainContentRef.current?.getBoundingClientRect();
    const firstKpi = document.querySelector('.shadcn-card') as HTMLElement | null;
    const firstKpiRect = firstKpi?.getBoundingClientRect();
    // #region agent log
    fetch('http://127.0.0.1:7281/ingest/9f4619ca-3c4c-4985-8121-3b0a2609e4da',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'53795b'},body:JSON.stringify({sessionId:'53795b',runId,hypothesisId:'H1',location:'Dashboard.tsx:mount',message:'Dashboard layout geometry snapshot',data:{innerWidth:window.innerWidth,innerHeight:window.innerHeight,docClientWidth:document.documentElement.clientWidth,bodyScrollWidth:document.body.scrollWidth,mdMatch:window.matchMedia('(min-width: 768px)').matches,mainRect,contentRect,firstKpiRect,currentLocation:location},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
  }, [location]);
  
  return (
    <div className="flex min-h-screen relative md:overflow-hidden">
      {/* Sidebar - now fixed, no animation */}
      <Sidebar />

      {/* Main Content - animated */}
      <AnimatePresence mode="wait">
        <motion.div
          ref={mainContainerRef}
          key={location}
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.98 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="flex-1 flex flex-col relative z-10 ml-0 md:ml-64 md:rounded-l-3xl min-h-screen md:overflow-hidden"
        >
        <MobileHeader title="Tableau de bord" />
        <header className="bg-black/20 backdrop-blur-xl border-b border-white/10 px-6 py-4 md:rounded-tl-3xl">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold md:text-2xl text-white">
                Dashboard CALDY
              </h1>
              <p className="text-sm text-white/70">Construire pour durer</p>
            </div>
            <div className="flex items-center gap-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-white border-white/20 hover:bg-white/10"
                onClick={() => setLocation('/dashboard/settings')}
              >
                <Settings className="h-4 w-4 mr-2" />
                Paramètres
              </Button>
            </div>
          </div>
        </header>

        {/* Tabs Navigation */}
        <div className="bg-black/20 backdrop-blur-xl border-b border-white/10 px-6 md:rounded-tl-3xl">
          <div className="flex gap-2 overflow-x-auto">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation('/dashboard')}
              className={location === '/dashboard' ? 'bg-white/20 backdrop-blur-md border border-white/10 text-white hover:bg-white/30' : 'text-white hover:bg-white/10'}
            >
              Vue d'ensemble
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation('/dashboard/quotes')}
              className="text-white hover:bg-white/10"
            >
              <FileText className="h-4 w-4 mr-2" />
              Devis
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation('/dashboard/projects')}
              className="text-white hover:bg-white/10"
            >
              <Building className="h-4 w-4 mr-2" />
              Chantiers
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation('/dashboard/crm')}
              className="text-white hover:bg-white/10"
            >
              <Users className="h-4 w-4 mr-2" />
              CRM Pipeline
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation('/dashboard/planning')}
              className="text-white hover:bg-white/10"
            >
              <Calendar className="h-4 w-4 mr-2" />
              Planning
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation('/dashboard/payments')}
              className="text-white hover:bg-white/10"
            >
              <Euro className="h-4 w-4 mr-2" />
              Bilan Financier
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation('/dashboard/team')}
              className="text-white hover:bg-white/10"
            >
              <Users className="h-4 w-4 mr-2" />
              Équipe
            </Button>
          </div>
        </div>

        {/* Tab Content */}
        <main ref={mainContentRef} className="flex-1 px-3 py-3 pb-[env(safe-area-inset-bottom)] md:px-6 md:py-6 space-y-6 overflow-auto">
          <OverviewTab />
        </main>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

// Overview Tab Component
function OverviewTab() {
  const [, setLocation] = useLocation();
  const { chantiers } = useChantiers();
  const { factures } = useFactures();
  const { devisList } = useDevis();

  const chantiersActifs = chantiers.filter((c) => c.statut !== 'terminé' && !c.archived).length;
  const chantiersEnCours = chantiers.filter((c) => c.statut === 'en cours').length;

  // Données financières réelles depuis les factures
  const totalFacture = useMemo(() => factures.reduce((s, f) => s + f.montantTTC, 0), [factures]);
  const totalPaye = useMemo(() => factures.filter((f) => f.statut === 'payee').reduce((s, f) => s + f.montantTTC, 0), [factures]);
  const totalImpaye = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return factures.filter((f) => f.statut !== 'payee' && f.dateEcheance && f.dateEcheance < today).reduce((s, f) => s + f.montantTTC, 0);
  }, [factures]);

  // Devis en attente de réponse (envoyés depuis + de 7 jours)
  const devisEnvoyes = useMemo(() => devisList.filter((d) => d.statut === 'envoye'), [devisList]);
  const devisARelancer = useMemo(() => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const cutoff = sevenDaysAgo.toISOString().split('T')[0];
    return devisEnvoyes.filter((d) => d.dateEmission <= cutoff);
  }, [devisEnvoyes]);

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 [@media(max-width:349px)]:grid-cols-1 gap-2 md:grid-cols-4 md:gap-4">
        <Card
          className="min-w-0 bg-black/20 backdrop-blur-xl border border-white/10 text-white cursor-pointer hover:bg-white/10 transition-colors p-3 md:p-5"
          onClick={() => setLocation('/dashboard/payments')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">CA Facturé</CardTitle>
            <Euro className="h-4 w-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-base font-bold md:text-xl">{formatCHF(totalFacture)}</div>
            <p className="text-xs text-green-400/70 md:text-sm">{formatCHF(totalPaye)} encaissé</p>
          </CardContent>
        </Card>

        <Card
          className="min-w-0 bg-black/20 backdrop-blur-xl border border-white/10 text-white cursor-pointer hover:bg-white/10 transition-colors p-3 md:p-5"
          onClick={() => setLocation('/dashboard/projects')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Chantiers Actifs</CardTitle>
            <Building className="h-4 w-4 text-white/70" />
          </CardHeader>
          <CardContent>
            <div className="text-base font-bold md:text-xl">{chantiersActifs}</div>
            <p className="text-xs text-gray-500 md:text-sm">{chantiersEnCours} en cours</p>
          </CardContent>
        </Card>

        <Card
          className="min-w-0 bg-black/20 backdrop-blur-xl border border-white/10 text-white cursor-pointer hover:bg-white/10 transition-colors p-3 md:p-5"
          onClick={() => setLocation('/dashboard/quotes')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Devis en attente</CardTitle>
            <FileText className="h-4 w-4 text-yellow-400" />
          </CardHeader>
          <CardContent>
            <div className="text-base font-bold md:text-xl">{devisEnvoyes.length}</div>
            <p className="text-xs text-gray-500 md:text-sm">{devisList.length} devis au total</p>
          </CardContent>
        </Card>

        <Card
          className={`min-w-0 bg-black/20 backdrop-blur-xl border text-white cursor-pointer hover:bg-white/10 transition-colors p-3 md:p-5 ${totalImpaye > 0 ? 'border-red-500/30' : 'border-white/10'}`}
          onClick={() => setLocation('/dashboard/payments')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Impayés</CardTitle>
            <TrendingUp className={`h-4 w-4 ${totalImpaye > 0 ? 'text-red-400' : 'text-white/70'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-base font-bold md:text-xl ${totalImpaye > 0 ? 'text-red-400' : ''}`}>{formatCHF(totalImpaye)}</div>
            <p className="text-xs text-gray-500 md:text-sm">
              {factures.filter((f) => f.statut === 'en_retard' || (f.statut !== 'payee' && f.dateEcheance && f.dateEcheance < new Date().toISOString().split('T')[0])).length} facture(s)
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Alertes relance devis */}
      {devisARelancer.length > 0 && (
        <Card className="bg-yellow-500/10 backdrop-blur-xl border border-yellow-500/30 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-yellow-300">
              <AlertTriangle className="h-4 w-4" />
              Devis à relancer ({devisARelancer.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {devisARelancer.map((d) => {
              const daysSince = Math.floor((Date.now() - new Date(d.dateEmission).getTime()) / (1000 * 60 * 60 * 24));
              return (
                <div key={d.id} className="flex items-center justify-between rounded-lg bg-black/20 px-3 py-2 text-sm">
                  <div>
                    <span className="font-medium">{d.numero}</span>
                    <span className="text-white/60 ml-2">— {d.client.nom}</span>
                    <span className="text-yellow-400/70 ml-2">({daysSince}j sans réponse)</span>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="h-7 text-xs border-yellow-400/30 text-yellow-300 hover:bg-yellow-400/10" onClick={() => setLocation('/dashboard/quotes')}>
                      <Clock className="mr-1 h-3 w-3" /> Voir
                    </Button>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Actions Rapides */}
        <Card className="bg-black/20 backdrop-blur-xl border border-white/10 text-white">
          <CardHeader>
            <CardTitle>Actions Rapides</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button
              className="w-full justify-start"
              variant="outline"
              onClick={() => setLocation('/dashboard/projects?openDialog=true')}
            >
              <Plus className="h-4 w-4 mr-2" />
              Nouveau Chantier
            </Button>
            <Button
              className="w-full justify-start"
              variant="outline"
              onClick={() => setLocation('/dashboard/quotes')}
            >
              <FileText className="h-4 w-4 mr-2" />
              Créer un Devis
            </Button>
            <Button
              className="w-full justify-start"
              variant="outline"
              onClick={() => setLocation('/dashboard/payments')}
            >
              <Euro className="h-4 w-4 mr-2" />
              Nouvelle Facture
            </Button>
          </CardContent>
        </Card>

        {/* Factures récentes */}
        <Card className="bg-black/20 backdrop-blur-xl border border-white/10 text-white">
          <CardHeader>
            <CardTitle>Dernières factures</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {factures.length === 0 ? (
              <p className="text-sm text-white/50">Aucune facture</p>
            ) : (
              factures.slice(0, 5).map((f) => (
                <div key={f.id} className="flex items-center justify-between rounded-lg bg-black/20 border border-white/10 px-3 py-2 text-sm">
                  <div>
                    <span className="font-medium">{f.numero}</span>
                    <span className="text-white/50 ml-2">{f.dateEmission}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{formatCHF(f.montantTTC)}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${f.statut === 'payee' ? 'bg-green-500/20 text-green-400' : f.statut === 'en_retard' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-300'}`}>
                      {f.statut === 'payee' ? 'Payée' : f.statut === 'en_retard' ? 'En retard' : 'En attente'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

