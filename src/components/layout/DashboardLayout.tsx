 import { ReactNode } from 'react';
 import { motion } from 'framer-motion';
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
       <div className="flex min-h-screen w-full bg-background">
         <AppSidebar />
         <SidebarInset className="flex-1">
           <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b border-border/50 bg-background/80 backdrop-blur-xl px-6">
             <SidebarTrigger className="-ml-2 text-muted-foreground hover:text-foreground transition-colors" />
             <div className="flex flex-1 items-center justify-between gap-4">
               <motion.h1 
                 initial={{ opacity: 0, y: -10 }}
                 animate={{ opacity: 1, y: 0 }}
                 className="text-lg font-semibold text-foreground tracking-tight"
               >
                 {title}
               </motion.h1>
               {showDateFilter && <DateFilterBar />}
             </div>
           </header>
           <main className="flex-1 p-6 md:p-8">
             <motion.div
               initial={{ opacity: 0, y: 10 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: 0.1 }}
             >
               {children}
             </motion.div>
           </main>
         </SidebarInset>
       </div>
     </SidebarProvider>
   );
 }