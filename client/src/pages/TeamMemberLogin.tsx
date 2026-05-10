import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Delete, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { getCsrfToken } from "@/lib/csrf";
import { OWNERS_LIST } from "@/lib/ownerUtils";
import { supabase } from "@/lib/supabase";

const OWNER_ID = OWNERS_LIST[0];
const PIN_LENGTH = 6;
const MAX_ATTEMPTS = 5;

export default function TeamMemberLogin() {
  const [pin, setPin] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [retryAfter, setRetryAfter] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [csrfToken, setCsrfToken] = useState<string | null>(null);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Pré-charger le CSRF token et vérifier si déjà connecté
  useEffect(() => {
    const existing = localStorage.getItem("member-session-token");
    if (existing) {
      fetch("/api/team/session", {
        headers: { Authorization: `Bearer ${existing}` },
      })
        .then((r) => {
          if (r.ok) setLocation("/team-members-dash");
        })
        .catch(() => {});
    }

    getCsrfToken()
      .then((t) => setCsrfToken(t))
      .catch(() => {});
  }, []);

  const addDigit = (digit: string) => {
    if (pin.length >= PIN_LENGTH || isRateLimited) return;
    setErrorMsg(null);
    setPin((prev) => [...prev, digit]);
  };

  const removeDigit = () => {
    setPin((prev) => prev.slice(0, -1));
  };

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 600);
  };

  const handleLogin = async () => {
    if (pin.length !== PIN_LENGTH || isRateLimited) return;

    if (!OWNER_ID) {
      toast({
        title: "Configuration manquante",
        description: "VITE_OWNER_IDS non défini. Contactez l'administrateur.",
        variant: "destructive",
      });
      return;
    }

    if (!csrfToken) {
      toast({
        title: "Erreur de sécurité",
        description: "Token de sécurité manquant. Rechargez la page.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/team/login-pin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfToken,
        },
        body: JSON.stringify({ pin: pin.join(""), ownerId: OWNER_ID }),
      });

      const data = await res.json() as {
        token?: string;
        memberId?: string;
        name?: string;
        supabaseAccessToken?: string | null;
        error?: string;
        message?: string;
        retryAfter?: number;
      };

      if (res.status === 429) {
        setIsRateLimited(true);
        const waitSec = data.retryAfter ?? 600;
        setRetryAfter(waitSec);
        setPin([]);
        setErrorMsg(`Trop de tentatives. Réessayez dans ${Math.ceil(waitSec / 60)} minutes.`);
        // Rafraîchir le CSRF token
        getCsrfToken().then((t) => setCsrfToken(t)).catch(() => {});
        setTimeout(() => {
          setIsRateLimited(false);
          setAttempts(0);
          setErrorMsg(null);
        }, waitSec * 1000);
        return;
      }

      if (!res.ok) {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        setPin([]);
        triggerShake();

        const remaining = MAX_ATTEMPTS - newAttempts;
        if (remaining <= 0) {
          setErrorMsg("Trop de tentatives. Réessayez dans 10 minutes.");
        } else {
          const msg = data.error === "PIN_INCORRECT"
            ? `Code incorrect. ${remaining} tentative${remaining > 1 ? "s" : ""} restante${remaining > 1 ? "s" : ""}.`
            : (data.message ?? "Erreur de connexion. Contactez votre patron.");
          setErrorMsg(msg);
        }
        // Rafraîchir le CSRF token après chaque erreur
        getCsrfToken().then((t) => setCsrfToken(t)).catch(() => {});
        return;
      }

      if (!data.token) {
        setErrorMsg("Réponse inattendue du serveur.");
        setPin([]);
        triggerShake();
        return;
      }

      localStorage.setItem("member-session-token", data.token);

      // Établir une session Supabase Auth pour que auth.uid() soit valorisé dans RLS.
      // Le JWT est signé côté serveur avec SUPABASE_JWT_SECRET.
      if (data.supabaseAccessToken) {
        await supabase.auth.setSession({
          access_token: data.supabaseAccessToken,
          refresh_token: "",
        });
      }

      setLocation("/team-members-dash");
    } catch {
      toast({ title: "Erreur réseau. Réessayez.", variant: "destructive" });
      setPin([]);
    } finally {
      setLoading(false);
    }
  };

  // Auto-submit quand PIN complet
  useEffect(() => {
    if (pin.length === PIN_LENGTH && !loading && !isRateLimited) {
      handleLogin();
    }
  }, [pin]);

  const digits = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0"];

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-xs space-y-8"
      >
        {/* Titre */}
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white">Espace équipe</h1>
          <p className="text-white/60 text-sm mt-1">
            Entrez votre code PIN à {PIN_LENGTH} chiffres
          </p>
        </div>

        {/* Indicateurs PIN — 6 points */}
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
              exit={{ opacity: 0, y: -8 }}
              className="flex items-center gap-2 p-3 bg-red-500/20 border border-red-500/40 rounded-xl"
            >
              <AlertCircle className="w-4 h-4 text-red-300 shrink-0" />
              <p className="text-sm text-red-200">{errorMsg}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Compteur tentatives (si au moins 1 erreur) */}
        {attempts > 0 && !isRateLimited && (
          <p className="text-center text-xs text-white/40">
            Tentatives : {attempts}/{MAX_ATTEMPTS}
          </p>
        )}

        {/* Clavier numérique custom */}
        <div className="grid grid-cols-3 gap-3">
          {digits.map((digit, idx) => {
            if (digit === "") {
              return <div key={idx} />;
            }
            return (
              <button
                key={idx}
                onClick={() => addDigit(digit)}
                disabled={loading || pin.length >= PIN_LENGTH || isRateLimited}
                className="
                  h-16 rounded-2xl text-xl font-semibold text-white
                  bg-white/10 backdrop-blur-md border border-white/10
                  hover:bg-white/20 active:scale-95
                  transition-all duration-150
                  disabled:opacity-40
                "
              >
                {digit}
              </button>
            );
          })}

          {/* Touche suppression */}
          <button
            onClick={removeDigit}
            disabled={loading || pin.length === 0 || isRateLimited}
            className="
              h-16 rounded-2xl text-white
              bg-white/10 backdrop-blur-md border border-white/10
              hover:bg-white/20 active:scale-95
              transition-all duration-150
              disabled:opacity-40
              flex items-center justify-center
            "
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>

        {/* Bouton connexion */}
        <Button
          onClick={handleLogin}
          disabled={pin.length !== PIN_LENGTH || loading || isRateLimited}
          className="w-full h-12 text-base bg-white/20 backdrop-blur-md text-white border border-white/20 hover:bg-white/30 disabled:opacity-40"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : isRateLimited ? (
            `Bloqué — réessayer dans ${Math.ceil(retryAfter / 60)} min`
          ) : (
            "Connexion"
          )}
        </Button>
      </motion.div>
    </div>
  );
}
