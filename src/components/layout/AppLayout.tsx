import { SidebarProvider } from '@/components/ui/sidebar';
import { useLocation } from 'react-router-dom';
import { AppSidebar } from './AppSidebar';
import { MobileTopBar } from './MobileTopBar';

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  // No /chat a própria página renderiza uma sidebar unificada
  // (navegação do app + sessões). Aqui escondemos a AppSidebar global
  // para evitar a sensação de "sidebar dupla".
  const isChat = pathname.startsWith('/chat');

  return (
    <SidebarProvider>
      <div className="h-screen flex w-full bg-background animate-fade-in overflow-hidden">
        {!isChat && <AppSidebar />}
        <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
          <MobileTopBar />
          <main className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
