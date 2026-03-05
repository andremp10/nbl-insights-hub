import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background animate-fade-in">
        <AppSidebar />
        <main className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
          {children}
        </main>
      </div>
    </SidebarProvider>
  );
}
