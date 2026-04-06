import { useMobileSidebar } from "../contexts/MobileSidebarContext";
import { Menu, X } from "lucide-react";
import { useEffect } from "react";

interface MobileHeaderProps {
  title?: string;
}

export function MobileHeader({ title }: MobileHeaderProps) {
  const { isOpen, open, close } = useMobileSidebar();

  useEffect(() => {
    const header = document.querySelector('[data-debug-mobile-header="main"]') as HTMLElement | null;
    // #region agent log
    fetch('http://127.0.0.1:7281/ingest/9f4619ca-3c4c-4985-8121-3b0a2609e4da',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'53795b'},body:JSON.stringify({sessionId:'53795b',runId:`run-${Date.now()}`,hypothesisId:'H3',location:'MobileHeader.tsx:effect',message:'Mobile header visual state',data:{isOpen,title,headerClass:header?.className,headerBg:header?window.getComputedStyle(header).backgroundColor:null,headerZ:header?window.getComputedStyle(header).zIndex:null},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
  }, [isOpen, title]);

  return (
    <div data-debug-mobile-header="main" className="md:hidden flex items-center justify-between px-3 bg-slate-900/80 backdrop-blur-md border-b border-white/10 sticky top-0 z-30" style={{ height: 52 }}>
      <button
        onClick={isOpen ? close : open}
        className="flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/15 active:bg-white/20 transition-colors touch-manipulation text-white"
        style={{ width: 44, height: 44, minWidth: 44, minHeight: 44 }}
        aria-label={isOpen ? "Fermer le menu" : "Ouvrir le menu"}
      >
        {isOpen ? <X size={20} strokeWidth={2} /> : <Menu size={20} strokeWidth={2} />}
      </button>

      {title && (
        <span className="absolute left-1/2 -translate-x-1/2 font-semibold text-white text-sm truncate max-w-[180px]">
          {title}
        </span>
      )}

      <div style={{ width: 44 }} />
    </div>
  );
}
