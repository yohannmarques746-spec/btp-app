import { MeshGradient } from "@paper-design/shaders-react"
import { motion, AnimatePresence } from "framer-motion"
import { useEffect, useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Mail, Lock, Eye, EyeOff, Loader2, User, LogIn, UserPlus } from "lucide-react"
import { useLocation } from "wouter"
import { useAuth } from "@/context/AuthContext"
import { supabase } from "@/lib/supabaseClient"
import { cn } from "@/lib/utils"
import { formatSupabaseAuthError } from "@/lib/authErrors"
import { useBranding } from "@/hooks/useBranding"

// ---------------------------------------------------------------------------
// Onglet actif persistant
// ---------------------------------------------------------------------------
type AuthMode = "signIn" | "signUp"
const AUTH_TAB_STORAGE_KEY = "app:auth-tab"
const LEGACY_AUTH_TAB_STORAGE_KEY = "caldy:auth-tab"

function useAuthMode(): [AuthMode, (m: AuthMode) => void] {
  const [mode, setModeState] = useState<AuthMode>(() => {
    if (typeof window === "undefined") return "signIn"
    const nextValue = window.localStorage.getItem(AUTH_TAB_STORAGE_KEY) ?? window.localStorage.getItem(LEGACY_AUTH_TAB_STORAGE_KEY)
    if (nextValue) {
      try {
        window.localStorage.setItem(AUTH_TAB_STORAGE_KEY, nextValue)
        window.localStorage.removeItem(LEGACY_AUTH_TAB_STORAGE_KEY)
      } catch {
        // noop
      }
    }
    return nextValue === "signUp" ? "signUp" : "signIn"
  })
  const setMode = (next: AuthMode) => {
    setModeState(next)
    try {
      window.localStorage.setItem(AUTH_TAB_STORAGE_KEY, next)
      window.localStorage.removeItem(LEGACY_AUTH_TAB_STORAGE_KEY)
    } catch {
      // noop
    }
  }
  return [mode, setMode]
}

// ---------------------------------------------------------------------------
// Champ générique avec icône + erreur animée
// ---------------------------------------------------------------------------
interface FieldProps {
  id: string
  label: string
  type?: string
  icon: React.ReactNode
  value: string
  onChange: (v: string) => void
  error?: string | null
  placeholder?: string
  autoComplete?: string
  trailing?: React.ReactNode
}

function Field({ id, label, type = "text", icon, value, onChange, error, placeholder, autoComplete, trailing }: FieldProps) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-white/80 text-xs font-medium">{label}</Label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50 pointer-events-none">{icon}</span>
        <Input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className={cn(
            "h-11 pl-10 pr-10 bg-white/5 border text-white placeholder:text-white/40",
            "transition-all duration-200",
            "focus-visible:ring-2 focus-visible:ring-fuchsia-400/40 focus-visible:ring-offset-0",
            "focus-visible:border-fuchsia-400/60",
            "focus-visible:shadow-[0_0_0_3px_rgba(217,70,239,0.15),0_0_25px_rgba(217,70,239,0.25)]",
            error
              ? "border-red-400/70 focus-visible:border-red-400 focus-visible:ring-red-400/40"
              : "border-white/15 hover:border-white/25",
          )}
        />
        {trailing && <span className="absolute right-2 top-1/2 -translate-y-1/2">{trailing}</span>}
      </div>
      <AnimatePresence mode="wait">
        {error && (
          <motion.p key={error} initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} className="text-xs text-red-300 pl-1">
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Bouton d'onglet avec indicateur animé
// ---------------------------------------------------------------------------
interface TabButtonProps {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
}

function TabButton({ active, onClick, icon, label }: TabButtonProps) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "relative z-10 flex items-center justify-center gap-2 h-10 rounded-xl",
        "text-sm font-medium transition-colors duration-200",
        active ? "text-white" : "text-white/60 hover:text-white/80",
      )}
    >
      {active && (
        <motion.span
          layoutId="auth-tab-indicator"
          className={cn("absolute inset-0 rounded-xl", "bg-gradient-to-r from-fuchsia-500 to-pink-500", "shadow-lg shadow-fuchsia-500/30")}
          transition={{ type: "spring", stiffness: 400, damping: 32 }}
        />
      )}
      <span className="relative z-10 flex items-center gap-2">{icon}{label}</span>
    </button>
  )
}

const OWNER_ID = import.meta.env.VITE_OWNER_ID as string | undefined;

// ---------------------------------------------------------------------------
// Formulaire connexion (Supabase signIn)
// ---------------------------------------------------------------------------
function SignInForm({ onSuccess, emailPlaceholder }: { onSuccess: () => void; emailPlaceholder: string }) {
  const { signIn, signOut } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!email || !password) { setError("Veuillez remplir tous les champs"); return }
    setLoading(true)
    try {
      const { data, error } = await signIn(email, password)
      if (error) {
        const isInvalid = /invalid login credentials|invalid_credentials/i.test(error.message || "")
        setError(
          isInvalid
            ? "Identifiants invalides. Si le compte vient d'être créé, confirmez d'abord l'email puis réessayez."
            : formatSupabaseAuthError(error, error.message || "Email ou mot de passe incorrect")
        )
      } else if (OWNER_ID && data?.user?.id !== OWNER_ID) {
        await signOut()
        setError("Accès refusé. Ce compte n'est pas autorisé à accéder à cette application.")
      } else {
        onSuccess()
      }
    } catch (err: any) {
      setError(err.message || "Une erreur est survenue")
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.form
      key="signin-form"
      onSubmit={handleSubmit}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.25 }}
      className="space-y-4"
      noValidate
    >
      {error && (
        <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 text-sm">{error}</div>
      )}
      <Field
        id="signin-email" label="Email" type="email"
        icon={<Mail className="h-4 w-4" />}
        value={email} onChange={setEmail}
        placeholder={emailPlaceholder} autoComplete="email"
      />
      <Field
        id="signin-password" label="Mot de passe"
        type={showPassword ? "text" : "password"}
        icon={<Lock className="h-4 w-4" />}
        value={password} onChange={setPassword}
        placeholder="••••••••" autoComplete="current-password"
        trailing={
          <Button type="button" variant="ghost" size="icon" onClick={() => setShowPassword(v => !v)}
            className="h-8 w-8 text-white/60 hover:text-white hover:bg-white/10"
            aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}>
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
        }
      />
      <Button
        type="submit" disabled={loading}
        className={cn("h-11 w-full text-sm font-semibold", "bg-gradient-to-r from-fuchsia-500 to-pink-500",
          "hover:from-fuchsia-400 hover:to-pink-400", "text-white shadow-lg shadow-fuchsia-500/30",
          "transition-all duration-200", "disabled:opacity-60 disabled:cursor-not-allowed")}
      >
        {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Connexion...</> : "Se connecter"}
      </Button>
    </motion.form>
  )
}

// ---------------------------------------------------------------------------
// Formulaire inscription (Supabase signUp)
// ---------------------------------------------------------------------------
function SignUpForm({ emailPlaceholder }: { emailPlaceholder: string }) {
  const { signUp } = useAuth()
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [pendingEmail, setPendingEmail] = useState<string | null>(null)
  const [resendLoading, setResendLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setInfo(null)
    if (!email || !password || !fullName) { setError("Veuillez remplir tous les champs"); return }
    setLoading(true)
    try {
      // #region agent log
      fetch('http://127.0.0.1:7471/ingest/9f4619ca-3c4c-4985-8121-3b0a2609e4da', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'b01c17' },
        body: JSON.stringify({
          sessionId: 'b01c17',
          runId: 'pre-fix',
          hypothesisId: 'H4',
          location: 'LoginPage.tsx:SignUpForm:handleSubmit',
          message: 'before signUp (LoginPage)',
          data: { emailFieldLen: email.trim().length },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
      const { error } = await signUp(email, password, fullName)
      if (error) {
        setError(formatSupabaseAuthError(error, "Erreur lors de la création du compte"))
      } else {
        setInfo("Compte créé. Vérifiez votre email pour confirmer le compte avant de vous connecter.")
        setPendingEmail(email.trim().toLowerCase())
      }
    } catch (err: any) {
      setError(err.message || "Une erreur est survenue")
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    if (!pendingEmail) return
    setResendLoading(true)
    setError(null)
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: pendingEmail,
      options: { emailRedirectTo: `${window.location.origin}/login` },
    })
    if (error) {
      setError(formatSupabaseAuthError(error, error.message || "Impossible de renvoyer l'email de confirmation."))
    }
    else setInfo("Email de confirmation renvoyé. Vérifiez aussi vos spams.")
    setResendLoading(false)
  }

  return (
    <motion.form
      key="signup-form"
      onSubmit={handleSubmit}
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.25 }}
      className="space-y-4"
      noValidate
    >
      {error && (
        <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 text-sm">{error}</div>
      )}
      {info && (
        <div className="p-3 bg-green-500/20 border border-green-500/50 rounded-lg text-green-100 text-sm">{info}</div>
      )}
      {pendingEmail && (
        <Button type="button" variant="outline" disabled={resendLoading} onClick={handleResend}
          className="w-full bg-white/10 border-white/40 text-white hover:bg-white/20 h-11 text-sm">
          {resendLoading ? "Envoi..." : "Renvoyer l'email de confirmation"}
        </Button>
      )}
      <Field
        id="signup-name" label="Nom complet *" type="text"
        icon={<User className="h-4 w-4" />}
        value={fullName} onChange={setFullName}
        placeholder="Jean Dupont" autoComplete="name"
      />
      <Field
        id="signup-email" label="Email *" type="email"
        icon={<Mail className="h-4 w-4" />}
        value={email} onChange={setEmail}
        placeholder={emailPlaceholder} autoComplete="email"
      />
      <Field
        id="signup-password" label="Mot de passe *"
        type={showPassword ? "text" : "password"}
        icon={<Lock className="h-4 w-4" />}
        value={password} onChange={setPassword}
        placeholder="Au moins 6 caractères" autoComplete="new-password"
        trailing={
          <Button type="button" variant="ghost" size="icon" onClick={() => setShowPassword(v => !v)}
            className="h-8 w-8 text-white/60 hover:text-white hover:bg-white/10"
            aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}>
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
        }
      />
      <Button
        type="submit" disabled={loading}
        className={cn("h-11 w-full text-sm font-semibold mt-2", "bg-gradient-to-r from-fuchsia-500 to-pink-500",
          "hover:from-fuchsia-400 hover:to-pink-400", "text-white shadow-lg shadow-fuchsia-500/30",
          "transition-all duration-200", "disabled:opacity-60 disabled:cursor-not-allowed")}
      >
        {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Création...</> : "Créer mon compte"}
      </Button>
    </motion.form>
  )
}

// ---------------------------------------------------------------------------
// Page principale — fond MeshGradient + glassmorphism
// ---------------------------------------------------------------------------
export default function LoginPage() {
  const [mode, setMode] = useAuthMode()
  const [dimensions, setDimensions] = useState({ width: 1920, height: 1080 })
  const [mounted, setMounted] = useState(false)
  const { user, loading } = useAuth()
  const { brandName, brandTagline, brandEmailPlaceholder } = useBranding()
  const [, setLocation] = useLocation()

  const colors = ["#0a1a3f", "#173a8a", "#2563eb", "#3b82f6", "#4338ca", "#111827"]
  const isOwner = !OWNER_ID || user?.id === OWNER_ID

  // Redirection si déjà connecté en tant que propriétaire
  useEffect(() => {
    if (!loading && user && isOwner) setLocation("/dashboard")
  }, [user, loading, isOwner, setLocation])

  useEffect(() => {
    setMounted(true)
    const update = () => setDimensions({ width: window.innerWidth, height: window.innerHeight })
    update()
    window.addEventListener("resize", update)
    return () => window.removeEventListener("resize", update)
  }, [])

  return (
    <section className="relative w-full min-h-screen overflow-hidden bg-[#05070f] flex items-center justify-center px-4 py-8">
      <div className="fixed inset-0 w-screen h-screen">
        {mounted ? (
          <>
            <MeshGradient
              width={dimensions.width}
              height={dimensions.height}
              colors={colors}
              distortion={0.85}
              swirl={0.55}
              grainMixer={0}
              grainOverlay={0}
              speed={0.38}
              offsetX={0.08}
            />
            <div className="absolute inset-0 pointer-events-none bg-black/35" />
          </>
        ) : (
          <div
            className="absolute inset-0 animate-gradient-slow"
            style={{
              background: "linear-gradient(135deg, #0a1a3f 0%, #2563eb 35%, #4338ca 65%, #0a1a3f 100%)",
              backgroundSize: "400% 400%",
            }}
          />
        )}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-md"
      >
        <div className={cn(
          "rounded-3xl border border-white/15 bg-white/5 backdrop-blur-2xl",
          "shadow-[0_20px_80px_-20px_rgba(0,0,0,0.6)]",
          "p-6 sm:p-8",
        )}>
          <div className="text-center mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              {mode === "signIn" ? "Connexion" : "Créer un compte"}
            </h1>
            <p className="text-white/70 text-sm mt-1.5">
              {mode === "signIn"
                ? `Connectez-vous à votre compte ${brandName}`
                : `Créez votre compte pour accéder à ${brandName}`}
            </p>
          </div>

          <div className="relative grid grid-cols-2 gap-1 p-1 rounded-2xl bg-white/5 border border-white/10 mb-6" role="tablist">
            <TabButton
              active={mode === "signIn"}
              onClick={() => setMode("signIn")}
              icon={<LogIn className="h-4 w-4" />}
              label="Connexion"
            />
            <TabButton
              active={mode === "signUp"}
              onClick={() => setMode("signUp")}
              icon={<UserPlus className="h-4 w-4" />}
              label="Créer un compte"
            />
          </div>

          <AnimatePresence mode="wait">
            {mode === "signIn"
              ? <SignInForm key="signin" onSuccess={() => setLocation("/dashboard")} emailPlaceholder={brandEmailPlaceholder} />
              : <SignUpForm key="signup" emailPlaceholder={brandEmailPlaceholder} />
            }
          </AnimatePresence>
        </div>

        <p className="text-center text-xs text-white/40 mt-6">{brandTagline ? `${brandName} — ${brandTagline}` : brandName}</p>
      </motion.div>

      <style>{`
        @keyframes gradient-slow {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .animate-gradient-slow { animation: gradient-slow 18s ease infinite; }
      `}</style>
    </section>
  )
}
