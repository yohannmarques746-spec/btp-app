import { MeshGradient } from "@paper-design/shaders-react"
import { useEffect, useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useLocation } from "wouter"
import { useAuth } from "@/context/AuthContext"
import { Mail, Lock, User } from "lucide-react"
import { Label } from "@/components/ui/label"

export default function AuthPage() {
  const [dimensions, setDimensions] = useState({ width: 1920, height: 1080 })
  const [mounted, setMounted] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [fullName, setFullName] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { signUp, signIn } = useAuth()
  const [, setLocation] = useLocation()

  const colors = ["#05070f", "#0b1324", "#111827", "#1f2937", "#1e3a8a", "#0f172a"]

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    // #region agent log
    fetch('http://127.0.0.1:7281/ingest/9f4619ca-3c4c-4985-8121-3b0a2609e4da',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'07ec15'},body:JSON.stringify({sessionId:'07ec15',runId:'supabase-auth-debug-1',hypothesisId:'H5',location:'client/src/pages/AuthPage.tsx:41',message:'Auth form submit',data:{isSignUp,hasEmail:Boolean(email),passwordLength:password?.length||0,hasFullName:Boolean(fullName)},timestamp:Date.now()})}).catch(()=>{});
    // #endregion

    try {
      if (isSignUp) {
        if (!email || !password || !fullName) {
          setError("Veuillez remplir tous les champs obligatoires")
          setLoading(false)
          return
        }
        const { error } = await signUp(email, password, fullName)
        if (error) {
          // #region agent log
          fetch('http://127.0.0.1:7281/ingest/9f4619ca-3c4c-4985-8121-3b0a2609e4da',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'07ec15'},body:JSON.stringify({sessionId:'07ec15',runId:'supabase-auth-debug-1',hypothesisId:'H5',location:'client/src/pages/AuthPage.tsx:53',message:'Auth signUp returned error',data:{errorMessage:error.message||null},timestamp:Date.now()})}).catch(()=>{});
          // #endregion
          setError(error.message || "Erreur lors de la création du compte")
        } else {
          // Rediriger vers la page de login avec code
          // #region agent log
          fetch('http://127.0.0.1:7281/ingest/9f4619ca-3c4c-4985-8121-3b0a2609e4da',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'07ec15'},body:JSON.stringify({sessionId:'07ec15',runId:'supabase-auth-debug-1',hypothesisId:'H5',location:'client/src/pages/AuthPage.tsx:58',message:'Auth signUp success redirecting to /login',data:{redirect:'/login'},timestamp:Date.now()})}).catch(()=>{});
          // #endregion
          setLocation("/login")
        }
      } else {
        if (!email || !password) {
          setError("Veuillez remplir tous les champs")
          setLoading(false)
          return
        }
        const { error } = await signIn(email, password)
        if (error) {
          // #region agent log
          fetch('http://127.0.0.1:7281/ingest/9f4619ca-3c4c-4985-8121-3b0a2609e4da',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'07ec15'},body:JSON.stringify({sessionId:'07ec15',runId:'supabase-auth-debug-1',hypothesisId:'H5',location:'client/src/pages/AuthPage.tsx:70',message:'Auth signIn returned error',data:{errorMessage:error.message||null},timestamp:Date.now()})}).catch(()=>{});
          // #endregion
          setError(error.message || "Email ou mot de passe incorrect")
        } else {
          // Rediriger vers la page de login avec code
          // #region agent log
          fetch('http://127.0.0.1:7281/ingest/9f4619ca-3c4c-4985-8121-3b0a2609e4da',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'07ec15'},body:JSON.stringify({sessionId:'07ec15',runId:'supabase-auth-debug-1',hypothesisId:'H5',location:'client/src/pages/AuthPage.tsx:75',message:'Auth signIn success redirecting to /login',data:{redirect:'/login'},timestamp:Date.now()})}).catch(()=>{});
          // #endregion
          setLocation("/login")
        }
      }
    } catch (err: any) {
      setError(err.message || "Une erreur est survenue")
    } finally {
      setLoading(false)
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
            <div className="absolute inset-0 pointer-events-none bg-black/45 dark:bg-black/60" />
          </>
        )}
      </div>

      <div className="relative z-10 max-w-md mx-auto px-6 w-full">
        <div className="bg-white/10 dark:bg-black/20 backdrop-blur-lg rounded-2xl border border-white/20 p-8 shadow-2xl">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">
              {isSignUp ? "Créer un compte" : "Connexion"}
            </h1>
            <p className="text-white/80 text-sm">
              {isSignUp 
                ? "Créez votre compte pour accéder à votre application CALDY"
                : "Connectez-vous à votre compte CALDY"}
            </p>
          </div>

          {/* Toggle Sign Up / Sign In */}
          <div className="flex gap-2 mb-6">
            <Button
              type="button"
              variant={!isSignUp ? 'default' : 'outline'}
              onClick={() => {
                setIsSignUp(false)
                setError(null)
              }}
              className={`flex-1 ${!isSignUp 
                ? 'bg-white/20 backdrop-blur-md text-white border-white/10' 
                : 'bg-transparent text-white border-white/20 hover:bg-white/10'}`}
            >
              Connexion
            </Button>
            <Button
              type="button"
              variant={isSignUp ? 'default' : 'outline'}
              onClick={() => {
                setIsSignUp(true)
                setError(null)
              }}
              className={`flex-1 ${isSignUp 
                ? 'bg-white/20 backdrop-blur-md text-white border-white/10' 
                : 'bg-transparent text-white border-white/20 hover:bg-white/10'}`}
            >
              Créer un compte
            </Button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="fullName" className="text-white">Nom complet *</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/50" />
                    <Input
                      id="fullName"
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Jean Dupont"
                      className="w-full bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-white/40 focus:ring-white/20 h-12 pl-10"
                    />
                  </div>
                </div>
              </>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="email" className="text-white">Email *</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/50" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="votre@email.com"
                  className="w-full bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-white/40 focus:ring-white/20 h-12 pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-white">Mot de passe *</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/50" />
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-white/40 focus:ring-white/20 h-12 pl-10"
                  required
                  minLength={6}
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-[rgba(63,63,63,1)] border-4 border-card text-white hover:bg-[rgba(63,63,63,0.9)] transition-colors h-12 text-base font-semibold disabled:opacity-50"
            >
              {loading ? "Chargement..." : isSignUp ? "Créer mon compte" : "Se connecter"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full bg-white/10 border-white/40 text-white hover:bg-white/20 transition-colors h-10 text-sm font-medium"
              onClick={() => setLocation("/dashboard")}
            >
              Accéder directement au dashboard
            </Button>
          </form>
        </div>
      </div>
    </section>
  )
}

