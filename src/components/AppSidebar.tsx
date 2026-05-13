import { Link, useRouterState } from "@tanstack/react-router";
import { Plane, LayoutDashboard, Radio, FileText, Radar } from "lucide-react";
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
} from "@/components/ui/sidebar";

const items = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Flight Plan", url: "/flight-plan", icon: FileText },
  { title: "ATC Center", url: "/atc", icon: Radar },
  { title: "ATIS", url: "/atis", icon: Radio },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isActive = (path: string) => (path === "/" ? pathname === "/" : pathname.startsWith(path));

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-2 py-2">
          <div className="relative flex h-8 w-8 items-center justify-center rounded-md bg-primary/15 text-primary">
            <Plane className="h-4 w-4 -rotate-45" />
          </div>
          {!collapsed && (
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-semibold tracking-wide">ATC365</span>
              <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">ATC Network</span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Operations</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <Link to={item.url} className="flex items-center gap-2">
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        {!collapsed ? (
          <div className="flex items-center gap-2 px-2 py-1.5 text-xs text-muted-foreground">
            <span className="relative inline-flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-status-landed opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-status-landed" />
            </span>
            <span className="font-mono">NETWORK ONLINE</span>
          </div>
        ) : (
          <div className="flex justify-center py-2">
            <span className="h-2 w-2 rounded-full bg-status-landed" />
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
