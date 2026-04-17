import { useState, useEffect, ReactNode } from 'react';
import { useLocation } from 'wouter';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Mail, User as UserIcon, Briefcase, Phone, LogOut, Loader2 } from 'lucide-react';
import type { TeamMember } from '@/lib/supabase';

interface AccountDialogProps {
  children: ReactNode;
}

export default function AccountDialog({ children }: AccountDialogProps) {
  const { user, signOut } = useAuth();
  const [, setLocation] = useLocation();
  const [teamMember, setTeamMember] = useState<TeamMember | null>(null);
  const [userType, setUserType] = useState<'admin' | 'team' | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    // Récupérer le type d'utilisateur et les informations
    const storedUserType = localStorage.getItem('userType');
    setUserType(storedUserType as 'admin' | 'team' | null);

    // Si c'est un membre d'équipe, récupérer ses informations
    if (storedUserType === 'team') {
      const storedMember = localStorage.getItem('teamMember');
      if (storedMember) {
        try {
          setTeamMember(JSON.parse(storedMember));
        } catch (error) {
          console.error('Error parsing team member data:', error);
        }
      }
    }
  }, []);

  // Fonction pour obtenir les initiales du nom
  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Déterminer le nom à afficher
  const displayName = userType === 'team' && teamMember 
    ? teamMember.name 
    : user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Utilisateur';

  // Déterminer l'email à afficher
  const displayEmail = userType === 'team' && teamMember 
    ? teamMember.email 
    : user?.email || 'Non disponible';

  // Déterminer le rôle
  const displayRole = userType === 'team' && teamMember 
    ? teamMember.role 
    : 'Administrateur';

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      localStorage.removeItem('teamMember');
      localStorage.removeItem('userType');
      localStorage.removeItem('member-session-token');
      await signOut();
      setLocation('/login');
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="bg-black/20 backdrop-blur-xl border border-white/10 text-white rounded-2xl max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white text-2xl">Mon Compte</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Avatar et nom */}
          <div className="flex flex-col items-center space-y-4">
            <Avatar className="h-20 w-20 border-2 border-white/20">
              <AvatarFallback className="bg-white/10 text-white text-xl">
                {getInitials(displayName)}
              </AvatarFallback>
            </Avatar>
            <div className="text-center">
              <h3 className="text-xl font-semibold text-white">{displayName}</h3>
              <p className="text-sm text-white/70">{displayRole}</p>
            </div>
          </div>

          <Separator className="bg-white/10" />

          {/* Informations du compte */}
          <div className="space-y-4">
            <Card className="bg-white/5 border-white/10">
              <CardContent className="pt-6 space-y-4">
                {/* Email */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-white/70" />
                    <Label className="text-white/70 text-sm">Email</Label>
                  </div>
                  <p className="text-white ml-6">{displayEmail}</p>
                </div>

                {/* Nom complet (si membre d'équipe) */}
                {userType === 'team' && teamMember && (
                  <>
                    <Separator className="bg-white/10" />
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <UserIcon className="h-4 w-4 text-white/70" />
                        <Label className="text-white/70 text-sm">Nom complet</Label>
                      </div>
                      <p className="text-white ml-6">{teamMember.name}</p>
                    </div>
                  </>
                )}

                {/* Rôle */}
                <Separator className="bg-white/10" />
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-white/70" />
                    <Label className="text-white/70 text-sm">Rôle</Label>
                  </div>
                  <p className="text-white ml-6">{displayRole}</p>
                </div>

                {/* Téléphone (si membre d'équipe) */}
                {userType === 'team' && teamMember && teamMember.phone && (
                  <>
                    <Separator className="bg-white/10" />
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-white/70" />
                        <Label className="text-white/70 text-sm">Téléphone</Label>
                      </div>
                      <p className="text-white ml-6">{teamMember.phone}</p>
                    </div>
                  </>
                )}

                {/* Code de connexion (si membre d'équipe) */}
                {userType === 'team' && teamMember && (
                  <>
                    <Separator className="bg-white/10" />
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <UserIcon className="h-4 w-4 text-white/70" />
                        <Label className="text-white/70 text-sm">Code de connexion</Label>
                      </div>
                      <p className="text-white ml-6 font-mono">{teamMember.login_code}</p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          <Separator className="bg-white/10" />

          <Button
            type="button"
            variant="outline"
            className="w-full h-11 touch-manipulation border-white/25 text-white hover:bg-white/10"
            disabled={loggingOut}
            onClick={handleLogout}
          >
            {loggingOut ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Déconnexion…
              </>
            ) : (
              <>
                <LogOut className="mr-2 h-4 w-4" />
                Se déconnecter
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
