import { useState, useEffect, useRef } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Sidebar from '@/components/Sidebar'
import { CRMPipeline } from '@/components/CRMPipeline'
import { MobileHeader } from '@/components/MobileHeader'
import { 
  Building, 
  FileText, 
  Wand2, 
  BarChart3,
  Users,
  Euro,
  TrendingUp,
  Clock,
  Plus,
  Upload,
  Calendar,
  Camera,
  Mail,
  Settings
} from 'lucide-react'
import { Link, useLocation } from 'wouter'
import { useChantiers } from '@/context/ChantiersContext'
import { PlanningRedirect } from '@/components/planning/PlanningRedirect'

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'quotes' | 'projects' | 'crm' | 'planning' | 'finance' | 'team'>('overview')
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
    fetch('http://127.0.0.1:7281/ingest/9f4619ca-3c4c-4985-8121-3b0a2609e4da',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'53795b'},body:JSON.stringify({sessionId:'53795b',runId,hypothesisId:'H1',location:'Dashboard.tsx:mount',message:'Dashboard layout geometry snapshot',data:{innerWidth:window.innerWidth,innerHeight:window.innerHeight,docClientWidth:document.documentElement.clientWidth,bodyScrollWidth:document.body.scrollWidth,mdMatch:window.matchMedia('(min-width: 768px)').matches,mainRect,contentRect,firstKpiRect,activeTab},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
  }, [activeTab]);
  
  return (
    <div className="flex min-h-screen relative md:overflow-hidden">
      {/* Sidebar - now fixed, no animation */}
      <Sidebar />

      {/* Main Content - animated */}
      <AnimatePresence mode="wait">
        <motion.div
          ref={mainContainerRef}
          key={`${location}-${activeTab}`}
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
              <Button variant="outline" size="sm" className="text-white border-white/20 hover:bg-white/10">
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
              onClick={() => setActiveTab('overview')}
              className={activeTab === 'overview' ? 'bg-white/20 backdrop-blur-md border border-white/10 text-white hover:bg-white/30' : 'text-white hover:bg-white/10'}
            >
              Vue d'ensemble
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setActiveTab('quotes')}
              className={activeTab === 'quotes' ? 'bg-white/20 backdrop-blur-md border border-white/10 text-white hover:bg-white/30' : 'text-white hover:bg-white/10'}
            >
              <FileText className="h-4 w-4 mr-2" />
              Devis
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setActiveTab('projects')}
              className={activeTab === 'projects' ? 'bg-white/20 backdrop-blur-md border border-white/10 text-white hover:bg-white/30' : 'text-white hover:bg-white/10'}
            >
              <Building className="h-4 w-4 mr-2" />
              Chantiers
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setActiveTab('crm')}
              className={activeTab === 'crm' ? 'bg-white/20 backdrop-blur-md border border-white/10 text-white hover:bg-white/30' : 'text-white hover:bg-white/10'}
            >
              <Users className="h-4 w-4 mr-2" />
              CRM Pipeline
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setActiveTab('planning')}
              className={activeTab === 'planning' ? 'bg-white/20 backdrop-blur-md border border-white/10 text-white hover:bg-white/30' : 'text-white hover:bg-white/10'}
            >
              <Calendar className="h-4 w-4 mr-2" />
              Planning
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setActiveTab('finance')}
              className={activeTab === 'finance' ? 'bg-white/20 backdrop-blur-md border border-white/10 text-white hover:bg-white/30' : 'text-white hover:bg-white/10'}
            >
              <Euro className="h-4 w-4 mr-2" />
              Bilan Financier
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setActiveTab('team')}
              className={activeTab === 'team' ? 'bg-white/20 backdrop-blur-md border border-white/10 text-white hover:bg-white/30' : 'text-white hover:bg-white/10'}
            >
              <Users className="h-4 w-4 mr-2" />
              Équipe
            </Button>
          </div>
        </div>

        {/* Tab Content */}
        <main ref={mainContentRef} className="flex-1 px-3 py-3 pb-[env(safe-area-inset-bottom)] md:px-6 md:py-6 space-y-6 overflow-auto">
          {activeTab === 'overview' && <OverviewTab />}
          {activeTab === 'quotes' && <QuotesTab />}
          {activeTab === 'projects' && <ProjectsTab />}
          {activeTab === 'crm' && <CRMTab />}
          {activeTab === 'planning' && <PlanningRedirect />}
          {activeTab === 'finance' && <FinanceTab />}
          {activeTab === 'team' && <TeamTab />}
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
  const totalChantiers = chantiers.length;
  const chantiersActifs = chantiers.filter((c) => c.statut !== 'terminé').length;
  const chantiersEnCours = chantiers.filter((c) => c.statut === 'en cours').length;
  const devisEnAttente = chantiers.filter((c) => c.statut === 'planifié').length;
  const chantiersTermines = chantiers.filter((c) => c.statut === 'terminé').length;
  const tauxConversion = totalChantiers > 0 ? Math.round((chantiersTermines / totalChantiers) * 100) : 0;
  const chiffreAffairesEstime = chantiersTermines * 12500;
  
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 [@media(max-width:349px)]:grid-cols-1 gap-2 md:grid-cols-4 md:gap-4">
        <Card
          className="min-w-0 bg-black/20 backdrop-blur-xl border border-white/10 text-white cursor-pointer hover:bg-white/10 transition-colors p-3 md:p-5"
          onClick={() => setLocation('/dashboard')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Chiffre d'Affaires</CardTitle>
              <Euro className="h-4 w-4 text-white/70" />
          </CardHeader>
          <CardContent>
            <div className="text-base font-bold md:text-xl">€{chiffreAffairesEstime.toLocaleString('fr-FR')}</div>
              <p className="text-xs text-gray-500 md:text-sm">{chantiersTermines} chantier(s) terminé(s)</p>
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
            <CardTitle className="text-sm font-medium">Devis En Attente</CardTitle>
            <FileText className="h-4 w-4 text-white/70" />
          </CardHeader>
          <CardContent>
            <div className="text-base font-bold md:text-xl">{devisEnAttente}</div>
            <p className="text-xs text-gray-500 md:text-sm">Réponses attendues</p>
          </CardContent>
        </Card>

        <Card
          className="min-w-0 bg-black/20 backdrop-blur-xl border border-white/10 text-white cursor-pointer hover:bg-white/10 transition-colors p-3 md:p-5"
          onClick={() => setLocation('/dashboard/projects')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taux de Conversion</CardTitle>
            <TrendingUp className="h-4 w-4 text-white/70" />
          </CardHeader>
          <CardContent>
            <div className="text-base font-bold md:text-xl">{tauxConversion}%</div>
            <p className="text-xs text-gray-500 md:text-sm">{chantiersTermines} terminé(s) sur {totalChantiers}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-black/20 backdrop-blur-xl border border-white/10 text-white">
          <CardHeader>
            <CardTitle>Activité Récente</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-white/70">Aucune activité récente</p>
          </CardContent>
        </Card>

        <Card className="bg-black/20 backdrop-blur-xl border border-white/10 text-white">
          <CardHeader>
            <CardTitle>Actions Rapides</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button 
              className="w-full justify-start" 
              variant="outline"
              onClick={() => {
                setLocation('/dashboard/projects?openDialog=true')
              }}
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
            <Button className="w-full justify-start" variant="outline">
              <Wand2 className="h-4 w-4 mr-2" />
              Estimation IA
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// Quotes Tab Component
function QuotesTab() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-sm font-semibold md:text-lg text-white">Gestion des Devis</h2>
        <Button className="h-11 px-4 text-sm touch-manipulation">
          <Plus className="h-4 w-4 mr-2" />
          Nouveau Devis
        </Button>
      </div>

      <Card className="bg-black/20 backdrop-blur-xl border border-white/10 text-white">
        <CardHeader>
          <CardTitle>Création de Devis par Robot IA</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-white/70">
            Le robot IA peut générer automatiquement des devis basés sur les informations du chantier.
          </p>
          <Button className="w-full">
            <Wand2 className="h-4 w-4 mr-2" />
            Générer un Devis avec l'IA
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="bg-black/20 backdrop-blur-xl border border-white/10 text-white">
            <CardHeader>
              <CardTitle className="text-base text-white">Devis #{i}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-white/70">En attente de validation</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

// Projects Tab Component
function ProjectsTab() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-sm font-semibold md:text-lg text-white">Estimation Automatique des Chantiers</h2>
        <Button className="h-11 px-4 text-sm touch-manipulation">
          <Plus className="h-4 w-4 mr-2" />
          Nouveau Chantier
        </Button>
      </div>

      <Card className="bg-black/20 backdrop-blur-xl border border-white/10 text-white">
        <CardHeader>
          <CardTitle>Ajouter un Chantier</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-white">Surface (m²)</label>
            <input
              type="number"
              className="w-full px-3 py-2 rounded-md border bg-black/20 backdrop-blur-md border-white/10 text-white placeholder:text-white/50"
              placeholder="Ex: 50"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-white">Matériaux</label>
            <input
              type="text"
              className="w-full px-3 py-2 rounded-md border bg-black/20 backdrop-blur-md border-white/10 text-white placeholder:text-white/50"
              placeholder="Ex: Carrelage, Peinture"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-white">Localisation</label>
            <input
              type="text"
              className="w-full px-3 py-2 rounded-md border bg-black/20 backdrop-blur-md border-white/10 text-white placeholder:text-white/50"
              placeholder="Ex: Paris 75001"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-white">Délai souhaité</label>
            <input
              type="text"
              className="w-full px-3 py-2 rounded-md border bg-black/20 backdrop-blur-md border-white/10 text-white placeholder:text-white/50"
              placeholder="Ex: 2 semaines"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Photos</label>
            <Button variant="outline" className="w-full">
              <Upload className="h-4 w-4 mr-2" />
              Importer des Photos
            </Button>
          </div>
          <Button className="w-full">
            <Wand2 className="h-4 w-4 mr-2" />
            Analyser avec l'IA
          </Button>
        </CardContent>
      </Card>

      <Card className="bg-black/20 backdrop-blur-xl border border-white/10 text-white">
        <CardHeader>
          <CardTitle>Résultats de l'Analyse IA</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium">Temps de réalisation</p>
              <p className="text-lg font-bold">15 jours</p>
            </div>
            <div>
              <p className="text-sm font-medium">Ouvriers requis</p>
              <p className="text-lg font-bold">3 personnes</p>
            </div>
            <div>
              <p className="text-sm font-medium">Coût total</p>
              <p className="text-lg font-bold">€12,500</p>
            </div>
            <div>
              <p className="text-sm font-medium">Bénéfice estimé</p>
              <p className="text-lg font-bold">€2,500</p>
            </div>
          </div>
          <div>
            <p className="text-sm font-medium mb-2">Répartition des coûts</p>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Transport</span>
                <span className="text-sm font-medium">€100</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Main-d'œuvre</span>
                <span className="text-sm font-medium">€1,200</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Matériaux</span>
                <span className="text-sm font-medium">€800</span>
              </div>
            </div>
          </div>
          <div>
            <p className="text-sm font-medium mb-2">Recommandations IA</p>
            <ul className="list-disc list-inside space-y-1 text-sm text-white/70">
              <li>Prévoir un échafaudage</li>
              <li>Outil spécifique nécessaire</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// CRM Tab Component
function CRMTab() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-sm font-semibold md:text-lg text-white">CRM Pipeline</h2>
        <Button className="h-11 px-4 text-sm touch-manipulation">
          <Mail className="h-4 w-4 mr-2" />
          Connecter Email
        </Button>
      </div>

      <Card className="bg-black/20 backdrop-blur-xl border border-white/10 text-white">
        <CardHeader>
          <CardTitle>Configuration Email</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Connectez votre email professionnel pour activer les automatisations.
          </p>
          <Button variant="outline" className="w-full">
            <Mail className="h-4 w-4 mr-2" />
            Connecter Gmail / Outlook
          </Button>
        </CardContent>
      </Card>

      <CRMPipeline />

      <Card className="bg-black/20 backdrop-blur-xl border border-white/10 text-white">
        <CardHeader>
          <CardTitle>Envoi Automatique d'Emails</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-white/70">
            Pour la première utilisation, importez au minimum 5 emails déjà envoyés par votre entreprise pour entraîner l'IA.
          </p>
          <Button variant="outline" className="w-full">
            <Upload className="h-4 w-4 mr-2" />
            Importer des Emails
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

// Finance Tab Component
function FinanceTab() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-sm font-semibold md:text-lg text-white">Bilan Financier</h2>
        <Button className="h-11 px-4 text-sm touch-manipulation">
          <Camera className="h-4 w-4 mr-2" />
          Scanner un Ticket
        </Button>
      </div>

      <Card className="bg-black/20 backdrop-blur-xl border border-white/10 text-white">
        <CardHeader>
          <CardTitle>Analyse Automatique des Dépenses</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-white/70">
            Prenez en photo vos tickets de caisse. L'IA analysera automatiquement les dépenses et les classera.
          </p>
          <Button variant="outline" className="w-full">
            <Camera className="h-4 w-4 mr-2" />
            Prendre une Photo
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-black/20 backdrop-blur-xl border border-white/10 text-white">
          <CardHeader>
            <CardTitle className="text-sm">Achat de Repas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-base font-bold md:text-xl">€450</p>
          </CardContent>
        </Card>
        <Card className="bg-black/20 backdrop-blur-xl border border-white/10 text-white">
          <CardHeader>
            <CardTitle className="text-sm">Plein d'Essence</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-base font-bold md:text-xl">€320</p>
          </CardContent>
        </Card>
        <Card className="bg-black/20 backdrop-blur-xl border border-white/10 text-white">
          <CardHeader>
            <CardTitle className="text-sm">Matériaux</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-base font-bold md:text-xl">€2,150</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// Team Tab Component
function TeamTab() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-sm font-semibold md:text-lg">Gestion de l'Équipe</h2>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Ajouter un Membre
        </Button>
      </div>

      <Card className="bg-black/20 backdrop-blur-xl border border-white/10 text-white">
        <CardHeader>
          <CardTitle>Membres de l'Équipe</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between p-3 bg-black/20 backdrop-blur-md border border-white/10 rounded-lg text-white">
              <div>
                <p className="font-medium">Jean Dupont</p>
                <p className="text-sm text-white/70">Chef de chantier</p>
              </div>
              <Badge>Actif</Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-black/20 backdrop-blur-md border border-white/10 rounded-lg text-white">
              <div>
                <p className="font-medium">Marie Martin</p>
                <p className="text-sm text-white/70">Ouvrier</p>
              </div>
              <Badge>Actif</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-black/20 backdrop-blur-xl border border-white/10 text-white">
        <CardHeader>
          <CardTitle>Affectation aux Chantiers</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-white/70">
            Affectez les membres de l'équipe aux chantiers depuis la fiche chantier ou depuis le planning.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
