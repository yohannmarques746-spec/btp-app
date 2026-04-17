import { useMobileSidebar } from "../contexts/MobileSidebarContext";
import { Menu, X } from "lucide-react";

interface MobileHeaderProps {
  title?: string;
}

export function MobileHeader({ title }: MobileHeaderProps) {
  const { isOpen, open, close } = useMobileSidebar();

  return (
    <div
      className="md:hidden flex items-center justify-between px-3 bg-slate-900/80 backdrop-blur-md border-b border-white/10 sticky top-0 z-30"
      style={{
        paddingTop: "env(safe-area-inset-top)",
        minHeight: 52,
      }}
    >
      <button
        onClick={isOpen ? close : open}
        className="flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/15 active:bg-white/20 transition-colors touch-manipulation text-white"
        style={{ width: 44, height: 44, minWidth: 44, minHeight: 44 }}
        aria-label={isOpen ? "Fermer le menu" : "Ouvrir le menu"}
      >
        {isOpen ? <X size={20} strokeWidth={2} /> : <Menu size={20} strokeWidth={2} />}
      </button>

      {title && (
        <span
          className="absolute left-1/2 -translate-x-1/2 font-semibold text-white text-sm truncate"
          style={{ maxWidth: "calc(100vw - 128px)" }}
        >
          {title}
        </span>
      )}

      <div style={{ width: 44 }} />
    </div>
  );
}
