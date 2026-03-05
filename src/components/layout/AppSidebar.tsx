import { LayoutDashboard, Bot, Wallet, PackageSearch, LogOut, Printer } from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarTrigger,
  SidebarRail,
  useSidebar,
} from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';

const menuItems = [
  { title: 'Home', url: '/', icon: LayoutDashboard },
  { title: 'Assistente', url: '/chat', icon: Bot },
  { title: 'Financeiro', url: '/financeiro', icon: Wallet },
  { title: 'Pedidos', url: '/pedidos', icon: PackageSearch },
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
    <Sidebar collapsible="icon" className="border-r border-sidebar-border bg-sidebar">
      <SidebarHeader className={cn(
        "border-b border-sidebar-border/50 transition-all duration-200",
        collapsed ? "p-2" : "p-4"
      )}>
        <div className={cn(
          "flex items-center",
          collapsed ? "flex-col gap-2" : "justify-between"
        )}>
          <div className={cn("flex items-center", collapsed ? "justify-center" : "gap-3")}>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shrink-0 shadow-md">
              <Printer className="h-5 w-5" />
            </div>
            {!collapsed && (
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-bold text-sidebar-foreground tracking-tight truncate">
                  NBL Gráfica
                </span>
                <span className="text-[10px] text-muted-foreground font-medium">
                  Insights Hub
                </span>
              </div>
            )}
          </div>
          <SidebarTrigger className="text-muted-foreground hover:text-foreground shrink-0" />
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup className={cn(collapsed ? "px-1 py-2" : "px-2 py-4")}>
          {!collapsed && (
            <div className="px-3 mb-3 text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold">
              Menu
            </div>
          )}
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {menuItems.map((item) => {
                const active = isActive(item.url);
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={active} tooltip={item.title}>
                      <NavLink
                        to={item.url}
                        end={item.url === '/'}
                        className={cn(
                          'relative flex items-center rounded-lg transition-all duration-200',
                          collapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-2.5',
                          active
                            ? 'bg-primary/15 text-primary font-medium'
                            : 'text-sidebar-foreground/70 hover:bg-accent/60 hover:text-sidebar-foreground'
                        )}
                      >
                        {active && !collapsed && (
                          <motion.div
                            layoutId="activeIndicator"
                            className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-primary rounded-full"
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                          />
                        )}
                        <item.icon className={cn("h-5 w-5 shrink-0", active && "text-primary")} />
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

      <SidebarFooter className={cn("border-t border-sidebar-border/50", collapsed ? "p-1.5" : "p-2")}>
        <SidebarMenu>
          <SidebarMenuItem>
            <div className={cn(
              "flex items-center",
              collapsed ? "flex-col gap-1" : "gap-1 justify-between"
            )}>
              <ThemeToggle />
              <SidebarMenuButton
                onClick={logout}
                tooltip="Sair"
                className={cn(
                  'flex items-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all duration-200',
                  collapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-2.5'
                )}
              >
                <LogOut className="h-5 w-5 shrink-0" />
                {!collapsed && <span className="text-sm">Sair</span>}
              </SidebarMenuButton>
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
