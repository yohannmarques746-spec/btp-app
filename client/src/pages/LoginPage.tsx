import { MeshGradient } from "@paper-design/shaders-react"
import { useEffect, useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useLocation } from "wouter"
import { Users, User, Key, Settings } from "lucide-react"
import { fetchTeamMembers, verifyTeamMemberCode, verifyAdminCode, type TeamMember } from "@/lib/supabase"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/context/AuthContext"

export default function LoginPage() {
  const { user, loading: authLoading } = useAuth()
  const [dimensions, setDimensions] = useState({ width: 1920, height: 1080 })
  const [mounted, setMounted] = useState(false)
  const [code, setCode] = useState("")
  const [loginMode, setLoginMode] = useState<'admin' | 'team'>('admin')
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [loadingMembers, setLoadingMembers] = useState(false)
  const [isAdminCodeDialogOpen, setIsAdminCodeDialogOpen] = useState(false)
  const [newAdminCode, setNewAdminCode] = useState("")
  const [, setLocation] = useLocation()

  const colors = ["#72b9bb", "#b5d9d9", "#ffd1bd", "#ffebe0", "#8cc5b8", "#dbf4a4"]

  useEffect(() => {
    setMounted(true)
    const update = () =>
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      })
    update()
    window.addEventListener("resize", update)
    return () => window.removeEventListener("resize", update)
  }, [])

  useEffect(() => {
    // Rediriger vers /auth si l'utilisateur n'est pas connecté
    if (!authLoading && !user) {
      setLocation("/auth")
    }
  }, [user, authLoading])

  useEffect(() => {
    if (loginMode === 'team' && user) {
      loadTeamMembers()
    }
  }, [loginMode, user])

  const loadTeamMembers = async () => {
    setLoadingMembers(true)
    try {
      const members = await fetchTeamMembers()
      setTeamMembers(members)
    } catch (error) {
      console.error('Error loading team members:', error)
    } finally {
      setLoadingMembers(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (loginMode === 'team') {
      // Vérifier le code avec Supabase
      const member = await verifyTeamMemberCode(code.trim())
      if (member) {
        // Stocker les infos du membre dans le localStorage
        localStorage.setItem('teamMember', JSON.stringify(member))
        localStorage.setItem('userType', 'team')
        setLocation("/team-dashboard")
      } else {
        alert("Code invalide ou membre inactif")
      }
    } else {
      // Mode admin - vérifier le code avec Supabase
      const isValid = await verifyAdminCode(code.trim())
      if (isValid) {
        localStorage.setItem('userType', 'admin')
        setLocation("/dashboard")
      } else {
        alert("Code admin invalide")
      }
    }
  }

  const handleUpdateAdminCode = async () => {
    if (!newAdminCode.trim()) {
      alert("Veuillez entrer un code")
      return
    }

    try {
      const { updateAdminCode } = await import("@/lib/supabase")
      const result = await updateAdminCode(newAdminCode.trim())
      if (result) {
        alert("Code admin mis à jour avec succès")
        setIsAdminCodeDialogOpen(false)
        setNewAdminCode("")
      } else {
        alert("Erreur lors de la mise à jour du code")
      }
    } catch (error) {
      console.error('Error updating admin code:', error)
      alert("Erreur lors de la mise à jour du code")
    }
  }

  return (
    <section className="relative w-full min-h-screen overflow-hidden bg-background flex items-center justify-center">
      <div className="fixed inset-0 w-screen h-screen">
        {mounted && (
          <>
            <MeshGradient
              width={dimensions.width}
              height={dimensions.height}
              colors={colors}
              distortion={0.8}
              swirl={0.6}
              grainMixer={0}
              grainOverlay={0}
              speed={0.42}
              offsetX={0.08}
            />
            <div className="absolute inset-0 pointer-events-none bg-white/20 dark:bg-black/25" />
          </>
        )}
      </div>

      <div className="relative z-10 max-w-md mx-auto px-6 w-full">
        <div className="bg-white/10 dark:bg-black/20 backdrop-blur-lg rounded-2xl border border-white/20 p-8 shadow-2xl">
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2 relative">
              <div className="flex-1" />
              <h1 className="text-3xl font-bold text-white flex-1 text-center absolute left-0 right-0">
                Connexion
              </h1>
              <div className="flex items-center gap-2 ml-auto">
              {loginMode === 'admin' && (
                <Dialog open={isAdminCodeDialogOpen} onOpenChange={setIsAdminCodeDialogOpen}>
                  <DialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-white/70 hover:text-white hover:bg-white/10 p-2 h-8 w-8 ml-auto"
                      title="Gérer le code admin"
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-black/20 backdrop-blur-xl border border-white/10 text-white rounded-2xl">
                    <DialogHeader>
                      <DialogTitle className="text-white">Gérer le Code Admin</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="admin-code" className="text-white">Nouveau Code Admin</Label>
                        <Input
                          id="admin-code"
                          type="text"
                          value={newAdminCode}
                          onChange={(e) => setNewAdminCode(e.target.value)}
                          placeholder="Entrez le nouveau code"
                          className="bg-black/20 border-white/10 text-white font-mono"
                          maxLength={20}
                        />
                        <p className="text-xs text-white/60">
                          Ce code sera utilisé pour se connecter en tant qu'administrateur
                        </p>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsAdminCodeDialogOpen(false)} className="text-white border-white/20 hover:bg-white/10">
                        Annuler
                      </Button>
                      <Button onClick={handleUpdateAdminCode}>
                        {newAdminCode ? "Modifier" : "Créer"} le Code
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
              </div>
            </div>
            <p className="text-white/80 text-sm text-center">
              {loginMode === 'admin' 
                ? "Entrer votre code de connection à votre application"
                : "Sélectionnez un membre d'équipe ou entrez votre code"}
            </p>
          </div>


          {loginMode === 'team' ? (
            <div className="space-y-4">
              {/* Liste des membres */}
              {loadingMembers ? (
                <div className="text-center py-8 text-white/70">Chargement...</div>
              ) : teamMembers.length > 0 ? (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {teamMembers.map((member) => (
                    <Card
                      key={member.id}
                      className="bg-white/10 border-white/20 text-white cursor-pointer hover:bg-white/20 transition-colors"
                      onClick={() => setCode(member.login_code)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{member.name}</p>
                            <p className="text-sm text-white/70">{member.role}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Key className="h-4 w-4 text-white/70" />
                            <span className="font-mono text-sm">{member.login_code}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-white/70">
                  Aucun membre d'équipe disponible
                </div>
              )}

              {/* Input pour code manuel */}
              <form className="space-y-4 mt-4">
                <div>
                  <Input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="Ou entrez votre code"
                    className="w-full bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-white/40 focus:ring-white/20 h-12 text-center text-lg tracking-widest font-mono"
                    maxLength={10}
                  />
                </div>

                <Button
                  type="button"
                  className="w-full bg-[rgba(63,63,63,1)] border-4 border-card text-white hover:bg-[rgba(63,63,63,0.9)] transition-colors h-12 text-base font-semibold"
                  onClick={() => setLocation("/dashboard")}
                >
                  Accéder au dashboard
                </Button>
              </form>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Entrez votre code"
                  className="w-full bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-white/40 focus:ring-white/20 h-12 text-center text-lg tracking-widest font-mono"
                  maxLength={10}
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-[rgba(63,63,63,1)] border-4 border-card text-white hover:bg-[rgba(63,63,63,0.9)] transition-colors h-12 text-base font-semibold"
              >
                Se connecter
              </Button>
            </form>
          )}
        </div>
      </div>
    </section>
  )
}
