import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { 
  Home, 
  X,
} from 'lucide-react';
import { useMobileSidebar } from '../contexts/MobileSidebarContext';
import { useBranding } from '@/hooks/useBranding';

export default function TeamSidebar() {
  const [collapsed] = useState(false);
  const { isOpen, close } = useMobileSidebar();
  const [location] = useLocation();
  const { brandName, brandTagline } = useBranding();

  const menuItems = [
    { icon: Home, label: 'Vue d\'ensemble', path: '/team-dashboard', active: location === '/team-dashboard' },
  ];

  return (
    <>
      <div className={cn(
        "hidden md:flex fixed left-0 top-0 h-screen bg-black/20 backdrop-blur-xl border-r border-white/10 transition-all duration-300 flex-col z-50 rounded-r-3xl",
        collapsed ? "w-16" : "w-64"
      )}>
        {/* Header */}
        <div className="p-4 border-b border-white/10">
          <div className="flex flex-col">
            <span className="font-semibold text-white">Membre d'équipe</span>
            <span className="text-xs text-white/70 italic truncate">{brandTagline || brandName}</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
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
                  collapsed && "justify-center",
                  item.active && "bg-white/20 backdrop-blur-md border border-white/10 text-white hover:bg-white/30",
                  !item.active && "hover:bg-white/10"
                )}
              >
                <item.icon className="h-4 w-4" />
                {!collapsed && <span>{item.label}</span>}
              </Button>
            </Link>
          ))}
        </nav>
      </div>

      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={close}
          aria-hidden="true"
        />
      )}

      <div
        className={`fixed top-0 left-0 h-full z-50 md:hidden transform transition-transform duration-300 ease-in-out bg-black/20 backdrop-blur-xl flex flex-col ${isOpen ? "translate-x-0" : "-translate-x-full"}`}
        style={{ width: 280 }}
      >
        <div className="flex items-center justify-between px-3 border-b border-white/10" style={{ height: 52 }}>
          <span className="font-semibold text-sm text-white">Menu</span>
          <button
            onClick={close}
            className="flex items-center justify-center rounded-xl hover:bg-white/10 active:bg-white/20 transition-colors touch-manipulation text-white"
            style={{ width: 44, height: 44, minWidth: 44, minHeight: 44 }}
            aria-label="Fermer le menu"
          >
            <X size={20} strokeWidth={2} />
          </button>
        </div>
        <nav className="flex-1 p-3 space-y-2">
          {menuItems.map((item) => (
            <Link key={`mobile-${item.path}`} href={item.path}>
              <button
                className={cn(
                  "flex items-center gap-3 px-3 rounded-xl text-sm font-medium transition-colors hover:bg-white/10 active:bg-white/20 touch-manipulation w-full text-white",
                  item.active && "bg-white/20"
                )}
                style={{ height: 48, minHeight: 48 }}
                onClick={close}
              >
                <item.icon className="h-4 w-4" />
                <span>{item.label}</span>
              </button>
            </Link>
          ))}
        </nav>
      </div>
    </>
  );
}

