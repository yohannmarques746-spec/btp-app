import { MeshGradient } from "@paper-design/shaders-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { XCircle, Loader2, Delete, AlertCircle } from "lucide-react";
import { getCsrfToken } from "@/lib/csrf";
import { AnimatePresence, motion } from "framer-motion";

const PIN_LENGTH = 6;

export default function InvitePage() {
  const [location] = useLocation();
  const inviteToken = location.startsWith("/invite/") ? location.split("/invite/")[1] ?? "" : "";

  const [dimensions, setDimensions] = useState({ width: 1920, height: 1080 });
  const [mounted, setMounted] = useState(false);
  const [inviteValid, setInviteValid] = useState<boolean | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  const [pin, setPin] = useState<string[]>([]);
  const [shake, setShake] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [csrfToken, setCsrfToken] = useState<string | null>(null);

  const [, setLocation] = useLocation();

  const colors = ["#05070f", "#0b1324", "#111827", "#1f2937", "#1e3a8a", "#0f172a"];

  useEffect(() => {
    setMounted(true);
    const update = () => setDimensions({ width: window.innerWidth, height: window.innerHeight });
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  useEffect(() => {
    if (!inviteToken) {
      setChecking(false);
      setInviteError("Lien d'invitation invalide.");
      setInviteValid(false);
      return;
    }

    // Vérification légère côté serveur — on laisse le POST /login-invite valider complètement
    setInviteValid(true);
    setChecking(false);

    getCsrfToken()
      .then((t) => setCsrfToken(t))
      .catch(() => {});
  }, [inviteToken]);

  const addDigit = (digit: string) => {
    if (pin.length >= PIN_LENGTH) return;
    setErrorMsg(null);
    setPin((prev) => [...prev, digit]);
  };

  const removeDigit = () => setPin((prev) => prev.slice(0, -1));

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 600);
  };

  const handleSubmit = async () => {
    if (pin.length !== PIN_LENGTH || verifying) return;
    if (!csrfToken) {
      setErrorMsg("Token de sécurité manquant. Rechargez la page.");
      return;
    }

    setVerifying(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/team/login-invite", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfToken,
        },
        body: JSON.stringify({ token: inviteToken, pin: pin.join("") }),
      });

      const data = await res.json() as {
        token?: string;
        error?: string;
        message?: string;
      };

      if (!res.ok) {
        setPin([]);
        triggerShake();

        if (res.status === 410 && data.error === "INVITE_EXPIRED") {
          setInviteValid(false);
          setInviteError("Ce lien d'invitation a expiré. Demandez une nouvelle invitation à votre patron.");
          return;
        }
        if (res.status === 410 && data.error === "INVITE_USED") {
          setInviteValid(false);
          setInviteError("Ce lien d'invitation a déjà été utilisé.");
          return;
        }
        if (res.status === 404) {
          setInviteValid(false);
          setInviteError("Lien d'invitation invalide ou expiré.");
          return;
        }
        if (res.status === 429) {
          setErrorMsg("Trop de tentatives. Réessayez dans 10 minutes.");
          return;
        }

        setErrorMsg(data.message ?? "Code PIN incorrect.");
        getCsrfToken().then((t) => setCsrfToken(t)).catch(() => {});
        return;
      }

      if (!data.token) {
        setErrorMsg("Réponse inattendue. Réessayez.");
        return;
      }

      localStorage.setItem("member-session-token", data.token);
      setLocation("/team-members-dash");
    } catch {
      setErrorMsg("Erreur réseau. Vérifiez votre connexion.");
    } finally {
      setVerifying(false);
    }
  };

  // Auto-submit quand PIN complet
  useEffect(() => {
    if (pin.length === PIN_LENGTH && !verifying) {
      handleSubmit();
    }
  }, [pin]);

  const digits = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0"];

  if (!mounted) return null;

  return (
    <section className="relative w-full min-h-screen overflow-hidden bg-background flex items-center justify-center">
      <div className="fixed inset-0 w-screen h-screen">
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
        <div className="absolute inset-0 pointer-events-none bg-black/45" />
      </div>

      <div className="relative z-10 w-full max-w-sm mx-auto px-4">
        <Card className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-8 shadow-2xl">
          {checking ? (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-white mx-auto mb-4" />
              <p className="text-white">Chargement de l'invitation...</p>
            </div>
          ) : inviteValid === false ? (
            <div className="text-center py-8">
              <XCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
              <CardTitle className="text-white mb-2 text-xl">Invitation invalide</CardTitle>
              <p className="text-white/70 text-sm mt-2">
                {inviteError ?? "Ce lien n'existe pas, a expiré ou a déjà été utilisé."}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              <CardHeader className="text-center p-0">
                <CardTitle className="text-xl font-bold text-white">Rejoindre l'équipe</CardTitle>
                <p className="text-white/70 text-sm mt-1">
                  Entrez votre code PIN à {PIN_LENGTH} chiffres
                </p>
              </CardHeader>

              {/* Indicateurs PIN */}
              <motion.div
                animate={shake ? { x: [-8, 8, -6, 6, -3, 3, 0] } : {}}
                transition={{ duration: 0.5 }}
                className="flex justify-center gap-3"
              >
                {Array.from({ length: PIN_LENGTH }).map((_, i) => (
                  <AnimatePresence key={i} mode="wait">
                    <motion.div
                      key={pin[i] !== undefined ? "filled" : "empty"}
                      initial={{ scale: 0.8 }}
                      animate={{ scale: 1 }}
                      className={`w-4 h-4 rounded-full border-2 transition-all duration-200 ${
                        pin[i] !== undefined
                          ? "bg-white border-white"
                          : "bg-transparent border-white/40"
                      }`}
                    />
                  </AnimatePresence>
                ))}
              </motion.div>

              {/* Message d'erreur */}
              <AnimatePresence mode="wait">
                {errorMsg && (
                  <motion.div
                    key={errorMsg}
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-2 p-3 bg-red-500/20 border border-red-500/40 rounded-xl"
                  >
                    <AlertCircle className="w-4 h-4 text-red-300 shrink-0" />
                    <p className="text-sm text-red-200">{errorMsg}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Clavier numérique */}
              <div className="grid grid-cols-3 gap-3">
                {digits.map((digit, idx) => {
                  if (digit === "") return <div key={idx} />;
                  return (
                    <button
                      key={idx}
                      onClick={() => addDigit(digit)}
                      disabled={verifying || pin.length >= PIN_LENGTH}
                      className="
                        h-14 rounded-2xl text-xl font-semibold text-white
                        bg-white/10 backdrop-blur-md border border-white/10
                        hover:bg-white/20 active:scale-95
                        transition-all duration-150 disabled:opacity-40
                      "
                    >
                      {digit}
                    </button>
                  );
                })}
                <button
                  onClick={removeDigit}
                  disabled={verifying || pin.length === 0}
                  className="
                    h-14 rounded-2xl text-white
                    bg-white/10 backdrop-blur-md border border-white/10
                    hover:bg-white/20 active:scale-95
                    transition-all duration-150 disabled:opacity-40
                    flex items-center justify-center
                  "
                >
                  <Delete className="w-5 h-5" />
                </button>
              </div>

              <Button
                onClick={handleSubmit}
                disabled={pin.length !== PIN_LENGTH || verifying}
                className="w-full h-12 text-base bg-white/20 backdrop-blur-md text-white border border-white/20 hover:bg-white/30 disabled:opacity-40"
              >
                {verifying ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  "Se connecter"
                )}
              </Button>
            </div>
          )}
        </Card>
      </div>
    </section>
  );
}
