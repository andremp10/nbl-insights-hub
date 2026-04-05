import { useState } from 'react';
import { LayoutDashboard, Bot, Wallet, PackageSearch, LogOut, Printer, UserPlus } from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { CreateUserModal } from '@/components/admin/CreateUserModal';
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
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

const menuItems = [
  { title: 'Home', url: '/', icon: LayoutDashboard },
  { title: 'Assistente', url: '/chat', icon: Bot },
  { title: 'Financeiro', url: '/financeiro', icon: Wallet },
  { title: 'Pedidos', url: '/pedidos', icon: PackageSearch },
];

export function AppSidebar() {
  const { signOut, isMaster } = useAuth();
  const { state } = useSidebar();
  const location = useLocation();
  const collapsed = state === 'collapsed';
  const [showCreateUser, setShowCreateUser] = useState(false);

  const isActive = (url: string) => {
    if (url === '/') return location.pathname === '/';
    return location.pathname.startsWith(url);
  };

  return (
    <>
      <Sidebar collapsible="icon" className="border-r border-sidebar-border bg-sidebar">
        <SidebarHeader className={cn(
          "border-b border-sidebar-border transition-all duration-200",
          collapsed ? "p-2" : "p-3"
        )}>
          <div className={cn(
            "flex items-center",
            collapsed ? "flex-col gap-2" : "justify-between"
          )}>
            <div className={cn("flex items-center", collapsed ? "justify-center" : "gap-2.5")}>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shrink-0">
                <Printer className="h-4 w-4" />
              </div>
              {!collapsed && (
                <div className="flex flex-col">
                  <span className="text-[13px] font-semibold text-sidebar-foreground tracking-tight truncate">
                    NBL Gráfica
                  </span>
                  <span className="text-[10px] text-muted-foreground -mt-0.5">Insights Hub</span>
                </div>
              )}
            </div>
            <SidebarTrigger className="text-muted-foreground hover:text-foreground shrink-0" />
          </div>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup className={cn(collapsed ? "px-1 py-2" : "px-2 py-3")}>
            {!collapsed && (
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-medium px-3 mb-1.5">Menu</span>
            )}
            <SidebarGroupContent>
              <SidebarMenu className="space-y-0.5">
                {menuItems.map((item) => {
                  const active = isActive(item.url);
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild isActive={active} tooltip={item.title}>
                        <NavLink
                          to={item.url}
                          end={item.url === '/'}
                          className={cn(
                            'relative flex items-center rounded-md transition-all duration-150',
                            collapsed ? 'justify-center p-2' : 'gap-2.5 px-3 py-2',
                            active
                              ? 'bg-primary/12 text-primary font-medium'
                              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                          )}
                        >
                          {active && !collapsed && (
                            <div
                              className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 bg-primary rounded-full transition-all duration-200"
                            />
                          )}
                          <item.icon className={cn("h-[18px] w-[18px] shrink-0", active && "text-primary")} />
                          {!collapsed && <span className="text-[13px]">{item.title}</span>}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className={cn("border-t border-sidebar-border", collapsed ? "p-1.5" : "p-2")}>
          <SidebarMenu>
            {isMaster && (
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => setShowCreateUser(true)}
                  tooltip="Novo Usuário"
                  className={cn(
                    'flex items-center rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all duration-150',
                    collapsed ? 'justify-center p-2' : 'gap-2.5 px-3 py-2'
                  )}
                >
                  <UserPlus className="h-[18px] w-[18px] shrink-0" />
                  {!collapsed && <span className="text-[13px]">Novo Usuário</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
            <SidebarMenuItem>
              <div className={cn(
                "flex items-center",
                collapsed ? "flex-col gap-1" : "gap-1 justify-between"
              )}>
                <ThemeToggle />
                <Separator orientation={collapsed ? "horizontal" : "vertical"} className={collapsed ? "w-6" : "h-5"} />
                <SidebarMenuButton
                  onClick={signOut}
                  tooltip="Sair"
                  className={cn(
                    'flex items-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all duration-150',
                    collapsed ? 'justify-center p-2' : 'gap-2.5 px-3 py-2'
                  )}
                >
                  <LogOut className="h-[18px] w-[18px] shrink-0" />
                  {!collapsed && <span className="text-[13px]">Sair</span>}
                </SidebarMenuButton>
              </div>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      <CreateUserModal open={showCreateUser} onOpenChange={setShowCreateUser} />
    </>
  );
}
