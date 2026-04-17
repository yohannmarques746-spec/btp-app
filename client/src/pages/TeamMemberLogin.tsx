import { useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Delete, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const OWNER_ID = import.meta.env.VITE_OWNER_ID as string | undefined;

export default function TeamMemberLogin() {
  const [pin, setPin] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const addDigit = (digit: string) => {
    if (pin.length >= 4) return;
    setPin((prev) => [...prev, digit]);
  };

  const removeDigit = () => {
    setPin((prev) => prev.slice(0, -1));
  };

  const handleLogin = async () => {
    if (pin.length !== 4) return;

    if (!OWNER_ID) {
      toast({
        title: "Configuration manquante",
        description: "VITE_OWNER_ID non défini. Contactez l'administrateur.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/team/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: pin.join(""), ownerId: OWNER_ID }),
      });

      const data = await res.json();

      if (!res.ok) {
        setPin([]);
        setShake(true);
        setTimeout(() => setShake(false), 600);
        toast({
          title: "Code incorrect",
          description: "Vérifiez votre code PIN.",
          variant: "destructive",
        });
        return;
      }

      localStorage.setItem("member-session-token", data.token);
      setLocation("/team-members-dash");
    } catch {
      toast({ title: "Erreur réseau", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

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
          <p className="text-white/60 text-sm mt-1">Entrez votre code PIN à 4 chiffres</p>
        </div>

        {/* Indicateurs PIN */}
        <motion.div
          animate={shake ? { x: [-8, 8, -6, 6, -3, 3, 0] } : {}}
          transition={{ duration: 0.5 }}
          className="flex justify-center gap-4"
        >
          {[0, 1, 2, 3].map((i) => (
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

        {/* Clavier numérique custom — pas de clavier système */}
        <div className="grid grid-cols-3 gap-3">
          {digits.map((digit, idx) => {
            if (digit === "") {
              return <div key={idx} />;
            }
            return (
              <button
                key={idx}
                onClick={() => addDigit(digit)}
                disabled={loading || pin.length >= 4}
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
            disabled={loading || pin.length === 0}
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
          disabled={pin.length !== 4 || loading}
          className="w-full h-12 text-base bg-white/20 backdrop-blur-md text-white border border-white/20 hover:bg-white/30 disabled:opacity-40"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            "Connexion"
          )}
        </Button>
      </motion.div>
    </div>
  );
}
