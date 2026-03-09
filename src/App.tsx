import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { useAccessControl } from "@/hooks/useAccessControl";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Subscribe from "./pages/Subscribe";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading: authLoading } = useAuth();
  const { hasAccess, loading: subLoading } = useAccessControl();

  if (authLoading || subLoading)
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  if (!user) return <Navigate to="/auth" replace />;
  if (!hasAccess) return <Navigate to="/subscribe" replace />;
  return <>{children}</>;
};

const SubscribeRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading: authLoading } = useAuth();
  const { hasAccess, loading: subLoading } = useAccessControl();

  if (authLoading || subLoading) return null;
  if (!user) return <Navigate to="/auth" replace />;
  if (hasAccess) return <Navigate to="/" replace />;
  return <>{children}</>;
};

const AuthRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
};

const AppRoutes = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
      <Route path="/subscribe" element={<SubscribeRoute><Subscribe /></SubscribeRoute>} />
      <Route path="/auth" element={<AuthRoute><Auth /></AuthRoute>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  </BrowserRouter>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AppRoutes />
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
