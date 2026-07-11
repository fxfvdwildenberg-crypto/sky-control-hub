import { Link, useRouterState } from "@tanstack/react-router";
import { Plane, LayoutDashboard, Radio, FileText, Radar, LogIn, LogOut, Headphones, Map as MapIcon, Handshake, Wrench, ClipboardList, Shield, User, ShoppingBag, CalendarDays, Settings, Users, Star, Lock } from "lucide-react";
import logoAsset from "@/assets/atc365-logo.png.asset.json";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { logout } from "@/lib/auth.functions";
import { useCurrentUser } from "@/lib/use-current-user";
import { Button } from "@/components/ui/button";
import { usePrefs, AVAILABLE_PAGES } from "@/lib/prefs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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

type Item = { title: string; url: string; icon: typeof Plane; tip?: string };

const dashboard: Item = { title: "Dashboard", url: "/", icon: LayoutDashboard, tip: "Live radar & summary" };

const sections: { label: string; items: Item[] }[] = [
  {
    label: "Flight",
    items: [
      { title: "File Plan", url: "/flight-plan", icon: FileText, tip: "Submit a new flight plan" },
      { title: "My Flights", url: "/my-flights", icon: Plane, tip: "Your flights & squawk control" },
      { title: "Charts", url: "/charts", icon: MapIcon, tip: "Airport charts" },
    ],
  },
  {
    label: "ATC",
    items: [
      { title: "ATC Center", url: "/atc", icon: Radar, tip: "Approve plans & manage traffic" },
      { title: "ATIS", url: "/atis", icon: Radio },
      { title: "Voice", url: "/voice", icon: Headphones },
    ],
  },
  {
    label: "Community",
    items: [
      { title: "Users", url: "/users", icon: Users },
      { title: "Friends", url: "/friends", icon: Users },
      { title: "Partners", url: "/partners", icon: Handshake },
      { title: "Events", url: "/events", icon: CalendarDays },
    ],
  },
  {
    label: "You",
    items: [
      { title: "Profile", url: "/profile", icon: User },
      { title: "Shop", url: "/shop", icon: ShoppingBag },
      { title: "Settings", url: "/settings", icon: Settings },
    ],
  },
  {
    label: "Others",
    items: [
      { title: "Ground Crew", url: "/ground", icon: Wrench },
      { title: "Overview", url: "/overview", icon: ClipboardList },
      { title: "Server", url: "/server", icon: Lock, tip: "Private ATC-only invite" },
    ],
  },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isActive = (path: string) => (path === "/" ? pathname === "/" : pathname.startsWith(path));
  const { data: currentUser } = useCurrentUser();
  const isOwner = currentUser?.discordId === "1405496423570473011";
  const { prefs } = usePrefs();

  const renderItem = (item: Item) => (
    <SidebarMenuItem key={item.url}>
      <SidebarMenuButton asChild isActive={isActive(item.url)}>
        <Link to={item.url} className="flex items-center gap-2 transition-all hover:translate-x-0.5">
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild><item.icon className="h-4 w-4 shrink-0" /></TooltipTrigger>
              {item.tip && <TooltipContent side="right">{item.tip}</TooltipContent>}
            </Tooltip>
          </TooltipProvider>
          {!collapsed && <span>{item.title}</span>}
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );

  const pinnedItems: Item[] = prefs.pinnedPages
    .map((p) => {
      const page = AVAILABLE_PAGES.find((a) => a.key === p);
      if (!page) return null;
      return { title: page.label, url: page.key, icon: Star };
    })
    .filter((x): x is Item => !!x);

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-2 py-2">
          <div className="relative flex h-8 w-8 items-center justify-center overflow-hidden rounded-md bg-primary/15">
            <img src={logoAsset.url} alt="ATC365" className="h-full w-full object-cover" />
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
          <SidebarGroupContent>
            <SidebarMenu>{renderItem(dashboard)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {pinnedItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Pinned</SidebarGroupLabel>
            <SidebarGroupContent><SidebarMenu>{pinnedItems.map(renderItem)}</SidebarMenu></SidebarGroupContent>
          </SidebarGroup>
        )}

        {sections.map((sec) => (
          <SidebarGroup key={sec.label}>
            <SidebarGroupLabel>{sec.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>{sec.items.map(renderItem)}</SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}

        {isOwner && (
          <SidebarGroup>
            <SidebarGroupLabel>Admin</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>{renderItem({ title: "Owner", url: "/owner", icon: Shield })}</SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <UserBlock collapsed={collapsed} />
      </SidebarFooter>
    </Sidebar>
  );
}

function UserBlock({ collapsed }: { collapsed: boolean }) {
  const { data: user, isLoading } = useCurrentUser();
  const logoutFn = useServerFn(logout);
  const qc = useQueryClient();

  const handleLogout = async () => {
    await logoutFn();
    qc.invalidateQueries({ queryKey: ["current-user"] });
  };

  if (collapsed) {
    return (
      <div className="flex justify-center py-2">
        <span className={`h-2 w-2 rounded-full ${user?.hasAtcRole ? "bg-status-landed" : "bg-muted-foreground"}`} />
      </div>
    );
  }

  if (isLoading) return <div className="px-2 py-1.5 text-xs text-muted-foreground font-mono">…</div>;

  if (!user) {
    return (
      <Link to="/login" className="block px-1 py-1">
        <Button size="sm" className="w-full gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
          <LogIn className="h-3.5 w-3.5" /> Sign in
        </Button>
      </Link>
    );
  }

  return (
    <div className="space-y-1 px-1 py-1">
      <div className="flex items-center gap-2 px-1 text-xs">
        <span className={`h-2 w-2 rounded-full ${user.hasAtcRole ? "bg-status-landed" : "bg-destructive"}`} />
        <span className="truncate font-mono">{user.username}</span>
      </div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground px-1">
        {user.hasAtcRole ? "ATC verified" : "No ATC role"}
      </div>
      <Button size="sm" variant="ghost" className="w-full justify-start gap-2 h-7" onClick={handleLogout}>
        <LogOut className="h-3.5 w-3.5" /> Sign out
      </Button>
    </div>
  );
}
