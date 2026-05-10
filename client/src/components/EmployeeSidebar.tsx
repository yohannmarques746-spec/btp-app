import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Home,
  Building2,
  Calendar,
  Users,
  FileText,
  Receipt,
  Workflow,
  User,
  X,
} from "lucide-react";
import type { MemberPermissions } from "@/hooks/useMemberSession";

interface SidebarItem {
  path: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  permissionKey: keyof MemberPermissions;
}

const ITEMS: SidebarItem[] = [
  { path: "/team-members-dash", label: "Vue d'ensemble", icon: Home, permissionKey: "dashboard" },
  { path: "/team-members-dash/chantiers", label: "Mes chantiers", icon: Building2, permissionKey: "chantiers" },
  { path: "/team-members-dash/planning", label: "Planning", icon: Calendar, permissionKey: "planning" },
  { path: "/team-members-dash/clients", label: "Clients", icon: Users, permissionKey: "clients" },
  { path: "/team-members-dash/devis", label: "Devis", icon: FileText, permissionKey: "devis" },
  { path: "/team-members-dash/factures", label: "Factures", icon: Receipt, permissionKey: "factures" },
  { path: "/team-members-dash/crm", label: "CRM", icon: Workflow, permissionKey: "crm" },
];

interface EmployeeSidebarProps {
  permissions: MemberPermissions;
  memberName: string;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export function EmployeeSidebar({
  permissions,
  memberName,
  mobileOpen,
  onMobileClose,
}: EmployeeSidebarProps) {
  const [location] = useLocation();
  const visibleItems = ITEMS.filter((it) => permissions[it.permissionKey]);

  const navItems = (onClose?: () => void) => (
    <>
      {visibleItems.map((it) => {
        const isActive = location === it.path;
        return (
          <Link key={it.path} href={it.path}>
            <Button
              variant="ghost"
              className={cn(
                "w-full justify-start gap-3 h-10 text-white",
                isActive && "bg-white/20 backdrop-blur-md border border-white/10 hover:bg-white/30",
                !isActive && "hover:bg-white/10"
              )}
              onClick={onClose}
            >
              <it.icon className="h-4 w-4" />
              <span>{it.label}</span>
            </Button>
          </Link>
        );
      })}
      <div className="border-t border-white/10 my-2 pt-2">
        <Link href="/team-members-dash/profile">
          <Button
            variant="ghost"
            className={cn(
              "w-full justify-start gap-3 h-10 text-white",
              location === "/team-members-dash/profile" && "bg-white/20 backdrop-blur-md border border-white/10 hover:bg-white/30",
              location !== "/team-members-dash/profile" && "hover:bg-white/10"
            )}
            onClick={onClose}
          >
            <User className="h-4 w-4" />
            <span>Mon profil équipe</span>
          </Button>
        </Link>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden md:flex fixed left-0 top-0 h-screen bg-black/20 backdrop-blur-xl border-r border-white/10 transition-all duration-300 flex-col z-50 rounded-r-3xl w-64">
        <div className="p-4 border-b border-white/10 flex-none">
          <span className="font-semibold text-white truncate">{memberName}</span>
          <p className="text-xs text-white/50">Espace équipe</p>
        </div>
        <nav className="flex-1 min-h-0 overflow-y-auto p-4 pt-3 space-y-2">
          <div className="text-xs font-medium text-white/60 uppercase tracking-wide mb-4">
            Navigation
          </div>
          {navItems()}
        </nav>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 md:hidden bg-slate-900/60 backdrop-blur-sm"
          onClick={onMobileClose}
          aria-hidden="true"
        />
      )}

      {/* Mobile drawer */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 md:hidden transform transition-transform duration-300 ease-in-out bg-black/20 backdrop-blur-xl flex flex-col",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
        style={{
          width: 280,
          paddingTop: "env(safe-area-inset-top)",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        <div
          className="flex items-center justify-between px-3 border-b border-white/10 flex-none"
          style={{ height: 52 }}
        >
          <span className="font-semibold text-sm text-white truncate">{memberName}</span>
          <button
            onClick={onMobileClose}
            className="flex items-center justify-center rounded-xl hover:bg-white/10 active:bg-white/20 transition-colors touch-manipulation text-white"
            style={{ width: 44, height: 44, minWidth: 44, minHeight: 44 }}
            aria-label="Fermer le menu"
          >
            <X size={20} strokeWidth={2} />
          </button>
        </div>
        <nav className="flex-1 min-h-0 overflow-y-auto p-3 pt-3 space-y-2">
          {navItems(onMobileClose)}
        </nav>
      </div>
    </>
  );
}
