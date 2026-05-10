import { useEffect } from "react";
import { useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { GlobalBackground } from "@/components/GlobalBackground";
import { ChantiersProvider } from "@/context/ChantiersContext";
import { AuthProvider } from "@/context/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AnimatePresence, motion } from "framer-motion";
import Home from "@/pages/Home";
import LoginPage from "@/pages/LoginPage";
import InvitePage from "@/pages/InvitePage";
import Dashboard from "@/pages/Dashboard";
import QuotesPage from "@/pages/QuotesPage";
import ProspectsPage from "@/pages/ProspectsPage";
import ProjectsPage from "@/pages/ProjectsPage";
import PlanningPage from "@/pages/PlanningPage";
import ClientsPage from "@/pages/ClientsPage";
import CRMPipelinePage from "@/pages/CRMPipelinePage";
import TeamPage from "@/pages/TeamPage";
import TeamPermissionsPage from "@/pages/TeamPermissionsPage";
import TeamMemberLogin from "@/pages/TeamMemberLogin";
import EmployeeShell from "@/pages/employee/EmployeeShell";
import PaymentsPage from "@/pages/PaymentsPage";
import SettingsPage from "@/pages/SettingsPage";
import NotFound from "@/pages/not-found";
import { MobileSidebarProvider } from "@/contexts/MobileSidebarContext";

const pageVariants = {
  initial: {
    opacity: 0,
    y: 20,
    scale: 0.98
  },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.4,
      ease: [0.22, 1, 0.36, 1]
    }
  },
  exit: {
    opacity: 0,
    y: -20,
    scale: 0.98,
    transition: {
      duration: 0.3,
      ease: [0.22, 1, 0.36, 1]
    }
  }
};

function AuthLegacyRedirect() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    setLocation("/login", { replace: true });
  }, [setLocation]);

  return null;
}

function Router() {
  const [location] = useLocation();
  // Liens sidebar orphelins à supprimer dans Sidebar/TeamSidebar:
  // /dashboard/estimation, /dashboard/ai-visualization

  const getComponent = () => {
    if (location.startsWith('/invite/')) {
      return <InvitePage />;
    }

    if (location.startsWith('/dashboard/team/permissions/')) {
      const memberId = location.split('/')[4] ?? '';
      return <ProtectedRoute><TeamPermissionsPage memberId={memberId} /></ProtectedRoute>;
    }

    switch (location) {
      case "/":
        return <Home />;
      case "/auth":
        return <AuthLegacyRedirect />;
      case "/login":
        return <LoginPage />;
      case "/dashboard":
        return <ProtectedRoute><Dashboard /></ProtectedRoute>;
      case "/dashboard/quotes":
        return <ProtectedRoute><QuotesPage /></ProtectedRoute>;
      case "/dashboard/prospects":
        return <ProtectedRoute><ProspectsPage /></ProtectedRoute>;
      case "/dashboard/projects":
        return <ProtectedRoute><ProjectsPage /></ProtectedRoute>;
      case "/dashboard/clients":
        return <ProtectedRoute><ClientsPage /></ProtectedRoute>;
      case "/dashboard/planning":
        return <ProtectedRoute><PlanningPage /></ProtectedRoute>;
      case "/dashboard/crm":
        return <ProtectedRoute><CRMPipelinePage /></ProtectedRoute>;
      case "/dashboard/team":
        return <ProtectedRoute><TeamPage /></ProtectedRoute>;
      case "/dashboard/payments":
        return <ProtectedRoute><PaymentsPage /></ProtectedRoute>;
      case "/dashboard/settings":
        return <ProtectedRoute><SettingsPage /></ProtectedRoute>;
      // Routes membres équipe — pas de guard Supabase
      case "/team-members-login":
        return <TeamMemberLogin />;
      default:
        if (location.startsWith("/team-members-dash")) {
          return <EmployeeShell />;
        }
        return <NotFound />;
    }
  };

  // Pages without sidebar (Home, Auth, Login, Invite) get full page animation
  const fullPageRoutes = new Set(["/", "/auth", "/login", "/team-members-login"]);
  const isFullPage = fullPageRoutes.has(location) || location.startsWith("/invite/");

  if (isFullPage) {
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key={location}
          initial="initial"
          animate="animate"
          exit="exit"
          variants={pageVariants}
          className="w-full h-full"
        >
          {getComponent()}
        </motion.div>
      </AnimatePresence>
    );
  }

  // Pages with sidebar - animation handled in PageWrapper or Dashboard
  return <>{getComponent()}</>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ChantiersProvider>
          <MobileSidebarProvider>
            <TooltipProvider>
              <GlobalBackground />
              <Toaster />
              <Router />
            </TooltipProvider>
          </MobileSidebarProvider>
        </ChantiersProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
