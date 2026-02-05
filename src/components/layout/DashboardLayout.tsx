 import { ReactNode } from 'react';
 import { SidebarProvider, SidebarTrigger, SidebarInset } from '@/components/ui/sidebar';
 import { AppSidebar } from './AppSidebar';
 import { DateFilterBar } from './DateFilterBar';
 
 interface DashboardLayoutProps {
   children: ReactNode;
   title: string;
   showDateFilter?: boolean;
 }
 
 export function DashboardLayout({ children, title, showDateFilter = true }: DashboardLayoutProps) {
   return (
     <SidebarProvider defaultOpen={true}>
       <div className="flex min-h-screen w-full">
         <AppSidebar />
         <SidebarInset className="flex-1">
           <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4">
             <SidebarTrigger className="-ml-1" />
             <div className="flex flex-1 items-center justify-between">
               <h1 className="text-lg font-semibold text-foreground">{title}</h1>
               {showDateFilter && <DateFilterBar />}
             </div>
           </header>
           <main className="flex-1 p-4 md:p-6">
             {children}
           </main>
         </SidebarInset>
       </div>
     </SidebarProvider>
   );
 }