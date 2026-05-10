import { useState } from "react";
import { useLocation } from "wouter";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, LogOut } from "lucide-react";
import { EmployeeSidebar } from "./EmployeeSidebar";
import type { MemberSession, MemberPermissions } from "@/hooks/useMemberSession";

interface EmployeeLayoutProps {
  children: React.ReactNode;
  member: MemberSession;
  permissions: MemberPermissions;
  logout: () => void;
}

const contentVariants = {
  initial: { opacity: 0, y: 20, scale: 0.98 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as const },
  },
  exit: {
    opacity: 0,
    y: -20,
    scale: 0.98,
    transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] as const },
  },
};

export function EmployeeLayout({ children, member, permissions, logout }: EmployeeLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [location] = useLocation();

  return (
    <div className="flex min-h-screen relative overflow-x-hidden md:overflow-hidden">
      <EmployeeSidebar
        permissions={permissions}
        memberName={member.name}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      <AnimatePresence mode="wait">
        <motion.div
          key={location}
          initial="initial"
          animate="animate"
          exit="exit"
          variants={contentVariants}
          className="flex-1 flex flex-col relative z-10 ml-0 md:ml-64 md:rounded-l-3xl min-h-screen md:overflow-hidden"
        >
          {/* Mobile header */}
          <div
            className="md:hidden flex items-center justify-between px-3 bg-slate-900/80 backdrop-blur-md border-b border-white/10 sticky top-0 z-30"
            style={{ paddingTop: "env(safe-area-inset-top)", minHeight: 52 }}
          >
            <button
              onClick={() => setMobileOpen(true)}
              className="flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/15 active:bg-white/20 transition-colors touch-manipulation text-white"
              style={{ width: 44, height: 44, minWidth: 44, minHeight: 44 }}
              aria-label="Ouvrir le menu"
            >
              <Menu size={20} strokeWidth={2} />
            </button>
            <span
              className="absolute left-1/2 -translate-x-1/2 font-semibold text-white text-sm truncate"
              style={{ maxWidth: "calc(100vw - 128px)" }}
            >
              {member.name}
            </span>
            <button
              onClick={logout}
              className="flex items-center justify-center rounded-xl hover:bg-white/10 active:bg-white/20 transition-colors touch-manipulation text-white/70"
              style={{ width: 44, height: 44, minWidth: 44, minHeight: 44 }}
              aria-label="Déconnexion"
            >
              <LogOut size={18} />
            </button>
          </div>

          <div className="px-3 py-3 pb-[env(safe-area-inset-bottom)] md:px-6 md:py-6">
            {children}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
