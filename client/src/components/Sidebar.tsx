import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Home,
  FileText,
  X,
  User,
  Users,
  Calendar,
  Building,
  Workflow,
  UserCircle,
  Euro
} from 'lucide-react';
import AccountDialog from './AccountDialog';
import { useMobileSidebar } from '../contexts/MobileSidebarContext';
import { useBranding } from '@/hooks/useBranding';

export function openMobileSidebar() {}

export default function Sidebar() {
  const [collapsed] = useState(false);
  const { isOpen, close } = useMobileSidebar();
  const [location] = useLocation();
  const { brandName, brandTagline, brandLogoUrl } = useBranding();

  const menuItems = [
    { icon: Home, label: "Vue d'ensemble", path: '/dashboard', active: location === '/dashboard' },
    { icon: Building, label: 'Mes Chantiers', path: '/dashboard/projects', active: location === '/dashboard/projects' },
    { icon: Calendar, label: 'Planning', path: '/dashboard/planning', active: location === '/dashboard/planning' },
    { icon: Workflow, label: 'CRM Pipeline', path: '/dashboard/crm', active: location === '/dashboard/crm' },
    { icon: FileText, label: 'Générateur de Devis', path: '/dashboard/quotes', active: location === '/dashboard/quotes' },
    { icon: Euro, label: 'Factures', path: '/dashboard/payments', active: location === '/dashboard/payments' },
    { icon: Users, label: 'Équipe', path: '/dashboard/team', active: location === '/dashboard/team' },
    { icon: User, label: 'Clients', path: '/dashboard/clients', active: location === '/dashboard/clients' },
  ];

  const sidebarContent = (
    <>
      <div className="p-4 border-b border-white/10 flex-none">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            {brandLogoUrl ? (
              <img
                src={brandLogoUrl}
                alt={`Logo ${brandName}`}
                className="h-6 w-6 rounded object-cover border border-white/20"
              />
            ) : null}
            <span className="font-semibold text-white truncate">{brandName}</span>
          </div>
          {brandTagline ? <span className="text-xs text-white/70 italic truncate">{brandTagline}</span> : null}
        </div>
      </div>

      <nav className="flex-1 min-h-0 overflow-y-auto p-4 pt-3 space-y-2">
        {!collapsed && (
          <div className="text-xs font-medium text-white/60 uppercase tracking-wide mb-4">
            Navigation
          </div>
        )}

        {menuItems.map((item) => (
          <Link key={item.path} href={item.path}>
            <Button
              variant="ghost"
              className={cn(
                "w-full justify-start gap-3 h-10 text-white",
                collapsed && 'justify-center',
                item.active && 'bg-white/20 backdrop-blur-md border border-white/10 text-white hover:bg-white/30',
                !item.active && 'hover:bg-white/10'
              )}
              data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
            >
              <item.icon className="h-4 w-4" />
              {!collapsed && <span>{item.label}</span>}
            </Button>
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t border-white/10 flex-none">
        <AccountDialog>
          <Button
            variant="ghost"
            className={cn(
              'w-full justify-start gap-3 h-10 text-white',
              collapsed && 'justify-center',
              'hover:bg-white/10'
            )}
          >
            <UserCircle className="h-4 w-4" />
            {!collapsed && <span>Compte</span>}
          </Button>
        </AccountDialog>
      </div>
    </>
  );

  return (
    <>
      <div className={cn(
        'hidden md:flex fixed left-0 top-0 h-screen bg-black/20 backdrop-blur-xl border-r border-white/10 transition-all duration-300 flex-col z-50 rounded-r-3xl',
        collapsed ? 'w-16' : 'w-64'
      )}>
        {sidebarContent}
      </div>

      {/* OVERLAY mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 md:hidden bg-slate-900/60 backdrop-blur-sm"
          onClick={close}
          aria-hidden="true"
        />
      )}

      {/* DRAWER mobile */}
      <div className={cn(
        'fixed inset-y-0 left-0 z-50 md:hidden transform transition-transform duration-300 ease-in-out bg-black/20 backdrop-blur-xl flex flex-col',
        isOpen ? 'translate-x-0' : '-translate-x-full'
      )} style={{ width: 280, paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {/* Drawer header */}
        <div className="flex items-center justify-between px-3 border-b border-white/10 flex-none" style={{ height: 52 }}>
          <div className="flex items-center gap-2 min-w-0">
            {brandLogoUrl ? (
              <img
                src={brandLogoUrl}
                alt={`Logo ${brandName}`}
                className="h-5 w-5 rounded object-cover border border-white/20"
              />
            ) : null}
            <span className="font-semibold text-sm text-white truncate">{brandName}</span>
          </div>
          <button
            onClick={close}
            className="flex items-center justify-center rounded-xl hover:bg-white/10 active:bg-white/20 transition-colors touch-manipulation text-white"
            style={{ width: 44, height: 44, minWidth: 44, minHeight: 44 }}
            aria-label="Fermer le menu"
          >
            <X size={20} strokeWidth={2} />
          </button>
        </div>

        {/* Nav — scrollable */}
        <nav className="flex-1 min-h-0 overflow-y-auto p-3 pt-3 space-y-2">
          {menuItems.map((item) => (
            <Link key={`mobile-${item.path}`} href={item.path}>
              <button
                className={cn(
                  'flex items-center gap-3 px-3 rounded-xl text-sm font-medium transition-colors hover:bg-white/10 active:bg-white/20 touch-manipulation w-full text-white',
                  item.active && 'bg-white/20'
                )}
                style={{ height: 48, minHeight: 48 }}
                onClick={close}
              >
                <item.icon className="h-4 w-4 flex-none" />
                <span>{item.label}</span>
              </button>
            </Link>
          ))}
        </nav>

        {/* Footer with Account — mirroring desktop */}
        <div className="p-3 border-t border-white/10 flex-none">
          <AccountDialog>
            <button
              className="flex items-center gap-3 px-3 rounded-xl text-sm font-medium transition-colors hover:bg-white/10 active:bg-white/20 touch-manipulation w-full text-white"
              style={{ height: 48, minHeight: 48 }}
              onClick={close}
            >
              <UserCircle className="h-4 w-4 flex-none" />
              <span>Compte</span>
            </button>
          </AccountDialog>
        </div>
      </div>
    </>
  );
}
