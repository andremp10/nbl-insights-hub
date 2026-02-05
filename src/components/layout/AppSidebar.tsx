 import { DollarSign, ShoppingCart, MessageSquare, LogOut } from 'lucide-react';
 import { NavLink, useLocation } from 'react-router-dom';
 import { useAuth } from '@/contexts/AuthContext';
 import {
   Sidebar,
   SidebarContent,
   SidebarGroup,
   SidebarGroupContent,
   SidebarGroupLabel,
   SidebarHeader,
   SidebarMenu,
   SidebarMenuButton,
   SidebarMenuItem,
   SidebarFooter,
   useSidebar,
 } from '@/components/ui/sidebar';
 import { cn } from '@/lib/utils';
 
 const menuItems = [
   {
     title: 'Financeiro',
     url: '/financeiro',
     icon: DollarSign,
   },
   {
     title: 'Pedidos',
     url: '/pedidos',
     icon: ShoppingCart,
   },
   {
     title: 'Chat',
     url: '/chat',
     icon: MessageSquare,
   },
 ];
 
 export function AppSidebar() {
   const { logout } = useAuth();
   const { state } = useSidebar();
   const location = useLocation();
   const collapsed = state === 'collapsed';
 
   return (
     <Sidebar className="border-r border-border bg-sidebar">
       <SidebarHeader className="border-b border-border p-4">
         <div className="flex items-center gap-2">
           <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">
             N
           </div>
           {!collapsed && (
             <span className="text-lg font-semibold text-sidebar-foreground">
               NBL Dashboard
             </span>
           )}
         </div>
       </SidebarHeader>
 
       <SidebarContent>
         <SidebarGroup>
           <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground">
             Menu Principal
           </SidebarGroupLabel>
           <SidebarGroupContent>
             <SidebarMenu>
               {menuItems.map((item) => {
                 const isActive = location.pathname === item.url;
                 return (
                   <SidebarMenuItem key={item.title}>
                     <SidebarMenuButton asChild isActive={isActive}>
                       <NavLink
                         to={item.url}
                         className={cn(
                           'flex items-center gap-3 rounded-lg px-3 py-2 transition-colors',
                           isActive
                             ? 'bg-primary/10 text-primary'
                             : 'text-sidebar-foreground hover:bg-sidebar-accent'
                         )}
                       >
                         <item.icon className="h-5 w-5" />
                         {!collapsed && <span>{item.title}</span>}
                       </NavLink>
                     </SidebarMenuButton>
                   </SidebarMenuItem>
                 );
               })}
             </SidebarMenu>
           </SidebarGroupContent>
         </SidebarGroup>
       </SidebarContent>
 
       <SidebarFooter className="border-t border-border p-2">
         <SidebarMenu>
           <SidebarMenuItem>
             <SidebarMenuButton
               onClick={logout}
               className="flex items-center gap-3 rounded-lg px-3 py-2 text-destructive hover:bg-destructive/10 transition-colors"
             >
               <LogOut className="h-5 w-5" />
               {!collapsed && <span>Sair</span>}
             </SidebarMenuButton>
           </SidebarMenuItem>
         </SidebarMenu>
       </SidebarFooter>
     </Sidebar>
   );
 }