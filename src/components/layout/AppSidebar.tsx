import { Home, DollarSign, ShoppingCart, MessageSquare, LogOut, Sparkles } from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
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
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';

const menuItems = [
  { title: 'Home', url: '/', icon: Home },
  { title: 'Assistente', url: '/chat', icon: MessageSquare },
  { title: 'Financeiro', url: '/financeiro', icon: DollarSign },
  { title: 'Pedidos', url: '/pedidos', icon: ShoppingCart },
];

export function AppSidebar() {
  const { logout } = useAuth();
  const { state } = useSidebar();
  const location = useLocation();
  const collapsed = state === 'collapsed';

  const isActive = (url: string) => {
    if (url === '/') return location.pathname === '/';
    return location.pathname.startsWith(url);
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border bg-sidebar-background/80 backdrop-blur-xl">
      <SidebarHeader className="border-b border-sidebar-border/50 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground font-semibold shadow-lg shadow-primary/20 shrink-0">
              <Sparkles className="h-4 w-4" />
            </div>
            {!collapsed && (
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-sidebar-foreground tracking-tight">
                  NBL Gráfica
                </span>
                <span className="text-[10px] text-muted-foreground font-medium">
                  Insights Hub
                </span>
              </div>
            )}
          </div>
          {!collapsed && <SidebarTrigger className="text-muted-foreground hover:text-foreground" />}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup className="px-3 py-4">
          <SidebarGroupLabel className="text-[10px] uppercase tracking-widest text-muted-foreground/70 font-medium px-3 mb-2">
            Menu
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {menuItems.map((item) => {
                const active = isActive(item.url);
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={active}>
                      <NavLink
                        to={item.url}
                        end={item.url === '/'}
                        className={cn(
                          'relative flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-200',
                          active
                            ? 'bg-primary/15 text-primary'
                            : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                        )}
                      >
                        {active && (
                          <motion.div
                            layoutId="activeIndicator"
                            className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-primary rounded-full"
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                          />
                        )}
                        <item.icon className={cn("h-[18px] w-[18px] shrink-0", active && "text-primary")} />
                        {!collapsed && <span className="text-sm">{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border/50 p-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={logout}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all duration-200"
            >
              <LogOut className="h-[18px] w-[18px] shrink-0" />
              {!collapsed && <span className="text-sm">Sair</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
