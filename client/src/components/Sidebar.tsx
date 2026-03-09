import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { 
  Hammer, 
  Home, 
  FileText, 
  Wand2, 
  User,
  Users,
  Settings, 
  Bell,
  Upload,
  Calendar,
  Building,
  Calculator,
  Workflow,
  UserCircle
} from 'lucide-react';
import AccountDialog from './AccountDialog';

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [location] = useLocation();

  const menuItems = [
    { icon: Home, label: 'Vue d\'ensemble', path: '/dashboard', active: location === '/dashboard' },
    { icon: Calculator, label: 'Estimation automatique', path: '/dashboard/estimation', active: location === '/dashboard/estimation' },
    { icon: Building, label: 'Mes Chantiers', path: '/dashboard/projects', active: location === '/dashboard/projects' },
    { icon: Calendar, label: 'Planning', path: '/dashboard/planning', active: location === '/dashboard/planning' },
    { icon: Workflow, label: 'CRM Pipeline', path: '/dashboard/crm', active: location === '/dashboard/crm' },
    { icon: FileText, label: 'Générateur de Devis', path: '/dashboard/quotes', active: location === '/dashboard/quotes' },
    { icon: Wand2, label: 'Visualisation IA', path: '/dashboard/ai-visualization', active: location === '/dashboard/ai-visualization' },
    { icon: Users, label: 'Équipe', path: '/dashboard/team', active: location === '/dashboard/team' },
    { icon: User, label: 'Clients', path: '/dashboard/clients', active: location === '/dashboard/clients' },
  ];

  const quickActions = [
    { icon: FileText, label: 'Nouveau Devis', action: () => console.log('New quote') },
    { icon: Wand2, label: 'Visualiser Projet', action: () => console.log('Visualize project') },
    { icon: Building, label: 'Ajouter Chantier', action: () => console.log('Add project') },
  ];

  return (
    <div className={cn(
      "fixed left-0 top-0 h-screen bg-black/20 backdrop-blur-xl border-r border-white/10 transition-all duration-300 flex flex-col z-50 rounded-r-3xl",
      collapsed ? "w-16" : "w-64"
    )}>
      {/* Header */}
      <div className="p-4 border-b border-white/10">
        <div className="flex flex-col">
          <span className="font-semibold text-white">PLANCHAIS</span>
          <span className="text-xs text-white/70 italic">Construire pour durer</span>
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
              data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
            >
              <item.icon className="h-4 w-4" />
              {!collapsed && <span>{item.label}</span>}
            </Button>
          </Link>
        ))}

        {!collapsed && (
          <>
            <div className="text-xs font-medium text-white/60 uppercase tracking-wide mt-8 mb-4">
              Actions Rapides
            </div>
            
            {quickActions.map((action, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                className="w-full justify-start gap-3 h-9 text-white border-white/20 hover:bg-white/10"
                onClick={action.action}
                data-testid={`quick-${action.label.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <action.icon className="h-4 w-4" />
                <span>{action.label}</span>
              </Button>
            ))}
          </>
        )}
      </nav>

      {/* Account Button at the bottom */}
      <div className="p-4 border-t border-white/10 mt-auto">
        <AccountDialog>
          <Button
            variant="ghost"
            className={cn(
              "w-full justify-start gap-3 h-10 text-white",
              collapsed && "justify-center",
              "hover:bg-white/10"
            )}
          >
            <UserCircle className="h-4 w-4" />
            {!collapsed && <span>Compte</span>}
          </Button>
        </AccountDialog>
      </div>
    </div>
  );
}