import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { DateFilterProvider } from "@/contexts/DateFilterContext";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageTransition } from "@/components/layout/PageTransition";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { LoadingBar } from "@/components/layout/LoadingBar";
import { FinanceiroSkeleton } from "@/components/layout/FinanceiroSkeleton";
import { PedidosSkeleton } from "@/components/layout/PedidosSkeleton";
import { HomeSkeleton } from "@/components/layout/HomeSkeleton";
import { PageSkeleton } from "@/components/layout/PageSkeleton";
import { Suspense, lazy } from "react";
import { AnimatePresence } from "framer-motion";

const Auth = lazy(() => import("./pages/Auth"));
const Home = lazy(() => import("./pages/Home"));
const Chat = lazy(() => import("./pages/Chat"));
const Financeiro = lazy(() => import("./pages/Financeiro"));
const Pedidos = lazy(() => import("./pages/Pedidos"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const ProtectedPage = ({ children }: { children: React.ReactNode }) => (
  <ProtectedRoute>
    <AppLayout>{children}</AppLayout>
  </ProtectedRoute>
);

function AnimatedRoutes() {
  const location = useLocation();
  
  const getSkeleton = (path: string) => {
    if (path === '/') return <HomeSkeleton />;
    if (path === '/financeiro') return <FinanceiroSkeleton />;
    if (path === '/pedidos') return <PedidosSkeleton />;
    return <PageSkeleton />;
  };

  return (
    <AnimatePresence mode="wait">
      <Suspense fallback={getSkeleton(location.pathname)}>
        <Routes location={location} key={location.pathname}>
          <Route path="/auth" element={<PageTransition><Auth /></PageTransition>} />
          <Route path="/reset-password" element={<PageTransition><ResetPassword /></PageTransition>} />
          <Route path="/" element={<ProtectedPage><PageTransition><Home /></PageTransition></ProtectedPage>} />
          <Route path="/chat" element={<ProtectedPage><PageTransition><Chat /></PageTransition></ProtectedPage>} />
          <Route path="/financeiro" element={<ProtectedPage><PageTransition><Financeiro /></PageTransition></ProtectedPage>} />
          <Route path="/pedidos" element={<ProtectedPage><PageTransition><Pedidos /></PageTransition></ProtectedPage>} />
          <Route path="*" element={<PageTransition><NotFound /></PageTransition>} />
        </Routes>
      </Suspense>
    </AnimatePresence>
  );
}

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark" storageKey="nbl-theme">
        <AuthProvider>
          <DateFilterProvider>
            <TooltipProvider>
              <LoadingBar />
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <AnimatedRoutes />
              </BrowserRouter>
            </TooltipProvider>
          </DateFilterProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
