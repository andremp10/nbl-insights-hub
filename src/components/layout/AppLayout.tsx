import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="dark min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-12 flex items-center border-b border-border/50 px-4 md:hidden">
            <SidebarTrigger />
          </header>
          <main className="flex-1 flex flex-col min-h-0">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
