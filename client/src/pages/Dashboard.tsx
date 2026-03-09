import { useState, useEffect } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Sidebar from '@/components/Sidebar'
import { CRMPipeline } from '@/components/CRMPipeline'
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

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'quotes' | 'projects' | 'crm' | 'planning' | 'finance' | 'team'>('overview')
  const [location, setLocation] = useLocation();

  // Vérifier si l'utilisateur est un membre d'équipe et rediriger
  useEffect(() => {
    const userType = localStorage.getItem('userType')
    if (userType === 'team') {
      setLocation('/team-dashboard')
    }
  }, [setLocation])
  
  return (
    <div className="flex min-h-screen relative overflow-hidden">
      {/* Sidebar - now fixed, no animation */}
      <Sidebar />

      {/* Main Content - animated */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`${location}-${activeTab}`}
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.98 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="flex-1 flex flex-col relative z-10 ml-64 rounded-l-3xl overflow-hidden"
        >
        <header className="bg-black/20 backdrop-blur-xl border-b border-white/10 px-6 py-4 rounded-tl-3xl">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">
                Dashboard PLANCHAIS
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
        <div className="bg-black/20 backdrop-blur-xl border-b border-white/10 px-6 rounded-tl-3xl">
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
        <main className="flex-1 p-6 space-y-6 overflow-auto">
          {activeTab === 'overview' && <OverviewTab />}
          {activeTab === 'quotes' && <QuotesTab />}
          {activeTab === 'projects' && <ProjectsTab />}
          {activeTab === 'crm' && <CRMTab />}
          {activeTab === 'planning' && <PlanningTab />}
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
  
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-black/20 backdrop-blur-xl border border-white/10 text-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Chiffre d'Affaires</CardTitle>
              <Euro className="h-4 w-4 text-white/70" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">€165,000</div>
              <p className="text-xs text-white/70">+18.2% ce mois</p>
          </CardContent>
        </Card>

        <Card className="bg-black/20 backdrop-blur-xl border border-white/10 text-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Chantiers Actifs</CardTitle>
            <Building className="h-4 w-4 text-white/70" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-white/70">+3 en cours</p>
          </CardContent>
        </Card>

        <Card className="bg-black/20 backdrop-blur-xl border border-white/10 text-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Devis En Attente</CardTitle>
            <FileText className="h-4 w-4 text-white/70" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">8</div>
            <p className="text-xs text-white/70">Réponses attendues</p>
          </CardContent>
        </Card>

        <Card className="bg-black/20 backdrop-blur-xl border border-white/10 text-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taux de Conversion</CardTitle>
            <TrendingUp className="h-4 w-4 text-white/70" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">73%</div>
            <p className="text-xs text-white/70">+5.2% devis → chantiers</p>
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
            <Button className="w-full justify-start" variant="outline">
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
        <h2 className="text-xl font-semibold text-white">Gestion des Devis</h2>
        <Button>
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
        <h2 className="text-xl font-semibold text-white">Estimation Automatique des Chantiers</h2>
        <Button>
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
        <h2 className="text-xl font-semibold text-white">CRM Pipeline</h2>
        <Button>
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

// Planning Tab Component
function PlanningTab() {
  const [currentDate] = useState(new Date())
  const days = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
  const weeks = [
    [1, 2, 3, 4, 5, 6, 7],
    [8, 9, 10, 11, 12, 13, 14],
    [15, 16, 17, 18, 19, 20, 21],
    [22, 23, 24, 25, 26, 27, 28],
    [29, 30, 31]
  ]

  const [events] = useState([
    { day: 5, title: 'Chantier Paris', time: '09:00' },
    { day: 12, title: 'Réunion client', time: '14:00' },
    { day: 18, title: 'Livraison matériaux', time: '10:00' },
    { day: 25, title: 'Fin de chantier', time: '17:00' }
  ])

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-white">Planning de Chantier</h2>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Nouveau Rendez-vous
        </Button>
      </div>

      <Card className="bg-black/20 backdrop-blur-xl border border-white/10 text-white">
        <CardHeader>
          <CardTitle>Calendrier - {currentDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {/* Days header */}
            <div className="grid grid-cols-7 gap-2 mb-2">
              {days.map((day) => (
                <div key={day} className="text-center text-sm font-medium text-white/70 py-2">
                  {day}
                </div>
              ))}
            </div>
            {/* Calendar grid */}
            {weeks.map((week, weekIndex) => (
              <div key={weekIndex} className="grid grid-cols-7 gap-2">
                {week.map((day) => {
                  const dayEvents = events.filter(e => e.day === day)
                  return (
                    <div
                      key={day}
                      className="min-h-[80px] p-2 border border-white/10 rounded-lg bg-black/20 backdrop-blur-md hover:bg-white/10 transition-colors text-white"
                    >
                      <div className="text-sm font-medium mb-1">{day}</div>
                      <div className="space-y-1">
                        {dayEvents.map((event, idx) => (
                          <div
                            key={idx}
                            className="text-xs bg-black/20 backdrop-blur-md border border-white/10 text-white rounded px-1 py-0.5 truncate"
                            title={`${event.time} - ${event.title}`}
                          >
                            {event.time} {event.title}
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
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
        <h2 className="text-xl font-semibold text-white">Bilan Financier</h2>
        <Button>
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
            <p className="text-2xl font-bold">€450</p>
          </CardContent>
        </Card>
        <Card className="bg-black/20 backdrop-blur-xl border border-white/10 text-white">
          <CardHeader>
            <CardTitle className="text-sm">Plein d'Essence</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">€320</p>
          </CardContent>
        </Card>
        <Card className="bg-black/20 backdrop-blur-xl border border-white/10 text-white">
          <CardHeader>
            <CardTitle className="text-sm">Matériaux</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">€2,150</p>
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
        <h2 className="text-xl font-semibold">Gestion de l'Équipe</h2>
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
