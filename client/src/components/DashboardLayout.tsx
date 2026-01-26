import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { NotificationSettings } from "@/components/NotificationSettings";
import { UserProfile } from "@/components/UserProfile";
import { Spotlight, useSpotlight } from "@/components/Spotlight";
import { BottomNavigation } from "@/components/BottomNavigation";
import { SwipeNavigationWrapper } from "@/components/SwipeNavigationWrapper";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { getLoginUrl } from "@/const";
import { useIsMobile } from "@/hooks/useMobile";
import {
  Book,
  FileText,
  FolderOpen,
  Home,
  LogOut,
  MessageCircle,
  MessageSquare,
  PanelLeft,
  Search,
  Settings,
  Users,
  ClipboardList,
  Bell,
  Shield,
  CheckSquare,
  Calendar,
  CalendarDays,
  CalendarClock,
  Star,
  Keyboard,
  ClipboardCheck,
  AtSign,
  Mail,
  Megaphone,
  GraduationCap,
  Sun,
  BarChart3,
  ShieldCheck,
  User,
  Building2,
  ChevronDown,
  ChevronUp,
  Clock,
  TrendingUp,
} from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { trpc } from "@/lib/trpc";
import { ThemeSwitcher } from "./ThemeSwitcher";
import { useKeyboardShortcuts, KeyboardShortcutsHelp } from "./KeyboardShortcuts";
import { FavoritesList } from "./FavoriteButton";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { useSwipeGesture } from "@/hooks/useSwipeGesture";
import { useMessageSoundNotification, useNotificationSoundAlert } from "@/hooks/useSoundNotification";
import { NotificationCenter } from "@/components/NotificationCenter";

// Haupt-Navigation
const menuItems = [
  { icon: Home, label: "Home", path: "/" },
  { icon: Search, label: "AI Suche", path: "/search" },
  { icon: Book, label: "How to Work", path: "/wiki" },
  { icon: MessageCircle, label: "Taps", path: "/taps" },
  { icon: ClipboardCheck, label: "Aufgaben", path: "/aufgaben" },
  { icon: CalendarDays, label: "Kalender", path: "/calendar" },
  { icon: Building2, label: "Team", path: "/orgchart" },
  { icon: Calendar, label: "Urlaub", path: "/leave" },
];

// Keine "Mehr"-Menüpunkte mehr nötig
const moreMenuItems: typeof menuItems = [];

const adminMenuItems = [
  { icon: CalendarClock, label: "Terminplanung", path: "/scheduling" },
  { icon: Users, label: "Teams", path: "/admin/teams" },
  { icon: CalendarDays, label: "Schichtplan", path: "/schichtplan" },
  { icon: BarChart3, label: "Schicht-Auswertungen", path: "/schicht-auswertungen" },
  { icon: Clock, label: "Soll-Stunden", path: "/admin/soll-stunden" },
  { icon: TrendingUp, label: "Überstunden", path: "/admin/ueberstunden" },
  { icon: FolderOpen, label: "Bereiche", path: "/admin/categories" },
  { icon: Users, label: "Benutzer", path: "/admin/users" },
  { icon: Calendar, label: "Urlaubsanträge", path: "/admin/leave" },
  { icon: Sun, label: "Urlaubsansprüche", path: "/admin/leave-balances" },
  { icon: Megaphone, label: "Ankündigungen", path: "/admin/announcements" },
  { icon: GraduationCap, label: "Zuweisungen", path: "/admin/assignments" },
  { icon: BarChart3, label: "Analytics", path: "/admin/analytics" },
  { icon: ShieldCheck, label: "Verifizierung", path: "/admin/verification" },
  { icon: CheckSquare, label: "Reviews", path: "/admin/reviews" },
  { icon: MessageSquare, label: "Feedback", path: "/admin/feedback" },
  { icon: Shield, label: "Audit-Log", path: "/admin/audit-log" },
  { icon: Settings, label: "Einstellungen", path: "/admin/settings" },
];

const SIDEBAR_WIDTH_KEY = "sidebar-width";
const DEFAULT_WIDTH = 260;
const MIN_WIDTH = 200;
const MAX_WIDTH = 400;

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const { loading, user } = useAuth();

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  if (loading) {
    return <DashboardLayoutSkeleton />;
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-8 p-8 max-w-md w-full">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Book className="w-8 h-8 text-primary" />
          </div>
          <div className="flex flex-col items-center gap-4">
            <h1 className="text-2xl font-semibold tracking-tight text-center">
              ohwee
            </h1>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              Melde dich mit deinem Google-Konto an, um auf ohwee zuzugreifen.
            </p>
          </div>
          <Button
            onClick={() => {
              window.location.href = getLoginUrl();
            }}
            size="lg"
            className="w-full card-shadow hover:elevated-shadow transition-all"
          >
            Mit Google anmelden
          </Button>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": `${sidebarWidth}px`,
        } as CSSProperties
      }
    >
      <DashboardLayoutContent setSidebarWidth={setSidebarWidth}>
        {children}
      </DashboardLayoutContent>
    </SidebarProvider>
  );
}

type DashboardLayoutContentProps = {
  children: React.ReactNode;
  setSidebarWidth: (width: number) => void;
};

function DashboardLayoutContent({
  children,
  setSidebarWidth,
}: DashboardLayoutContentProps) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showNotificationSettings, setShowNotificationSettings] = useState(false);
  const [showUserProfile, setShowUserProfile] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  
  // Spotlight search
  const { open: spotlightOpen, setOpen: setSpotlightOpen } = useSpotlight();
  
  // Enable keyboard shortcuts
  useKeyboardShortcuts(true);
  const activeMenuItem = [...menuItems, ...adminMenuItems].find(
    (item) => location === item.path || location.startsWith(item.path + "/")
  );
  const isMobile = useIsMobile();
  const isAdmin = user?.role === "admin";
  const isEditor = user?.role === "editor" || isAdmin;

  // Handle navigation - close sidebar on mobile after clicking a menu item
  const handleNavigation = (path: string) => {
    setLocation(path);
    if (isMobile) {
      toggleSidebar();
    }
  };

  // Swipe gestures for mobile sidebar
  useSwipeGesture({
    onSwipeRight: () => {
      if (isMobile && state === "collapsed") {
        toggleSidebar();
      }
    },
    onSwipeLeft: () => {
      if (isMobile && state === "expanded") {
        toggleSidebar();
      }
    },
    enabled: isMobile,
  });

  // Fetch unread notification count
  const { data: unreadCount } = trpc.notifications.unreadCount.useQuery(undefined, {
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch unread Taps count for header badge
  const { data: unreadTapsCount } = trpc.ohweees.unreadCount.useQuery(undefined, {
    refetchInterval: 30000,
  });

  // Fetch open tasks count for header badge
  const { data: openTasksCount } = trpc.tasks.openCount.useQuery(undefined, {
    refetchInterval: 60000,
  });

  // Calculate total badge count for header
  const totalBadgeCount = (unreadCount || 0) + (unreadTapsCount || 0) + (openTasksCount || 0);

  // Sound notifications for new messages and alerts
  useMessageSoundNotification();
  useNotificationSoundAlert();

  useEffect(() => {
    if (isCollapsed) {
      setIsResizing(false);
    }
  }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const sidebarLeft =
        sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const newWidth = e.clientX - sidebarLeft;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  return (
    <>
      <div className="relative overflow-hidden" ref={sidebarRef}>
        <Sidebar
          collapsible="offcanvas"
          className="border-r-0 bg-sidebar"
          disableTransition={isResizing}
        >
          <SidebarHeader className="h-16 justify-center border-b border-sidebar-border">
            <div className="flex items-center gap-3 px-2 transition-all w-full">
              <button
                onClick={toggleSidebar}
                className="h-8 w-8 flex items-center justify-center hover:bg-sidebar-accent rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring shrink-0"
                aria-label="Navigation umschalten"
              >
                <PanelLeft className="h-4 w-4 text-muted-foreground" />
              </button>
              {!isCollapsed ? (
                <div className="flex items-center gap-2 min-w-0">
                  <Book className="h-5 w-5 text-primary shrink-0" />
                  <span className="font-semibold tracking-tight truncate">
                    ohwee
                  </span>
                </div>
              ) : null}
            </div>
          </SidebarHeader>

          <SidebarContent className="gap-0 px-3 py-4">
            {/* Main Navigation */}
            <div className="mb-3">
              {!isCollapsed && (
                <p className="px-3 py-2.5 text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-widest">
                  Navigation
                </p>
              )}
              <SidebarMenu className="space-y-1">
                {menuItems.map((item) => {
                  const isActive =
                    location === item.path ||
                    (item.path !== "/" && location.startsWith(item.path));
                  return (
                    <SidebarMenuItem key={item.path}>
                      <SidebarMenuButton
                        isActive={isActive}
                        onClick={() => handleNavigation(item.path)}
                        tooltip={item.label}
                        className={`h-11 transition-all duration-200 rounded-xl group ${
                          isActive 
                            ? "sidebar-item-active shadow-sm" 
                            : "hover:bg-accent/60"
                        }`}
                      >
                        <div className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-200 ${
                          isActive 
                            ? "bg-primary/10" 
                            : "group-hover:bg-accent"
                        }`}>
                          <item.icon
                            className={`h-[18px] w-[18px] transition-colors duration-200 ${
                              isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                            }`}
                          />
                        </div>
                        <span className={`text-[14px] group-data-[collapsible=icon]:hidden ${
                          isActive ? "font-semibold" : "font-medium"
                        }`}>{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </div>

            {/* Mehr-Navigation (aufklappbar) */}
            <Collapsible open={moreOpen} onOpenChange={setMoreOpen} className="mt-2 group-data-[collapsible=icon]:hidden">
              <CollapsibleTrigger asChild>
                <button className="flex items-center gap-2 w-full px-3 py-2.5 text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-widest hover:text-muted-foreground transition-colors">
                  <span>Mehr</span>
                  {moreOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <SidebarMenu className="space-y-1">
                  {moreMenuItems.map((item) => {
                    const isActive =
                      location === item.path ||
                      (item.path !== "/" && location.startsWith(item.path));
                    return (
                      <SidebarMenuItem key={item.path}>
                        <SidebarMenuButton
                          isActive={isActive}
                          onClick={() => handleNavigation(item.path)}
                          tooltip={item.label}
                          className={`h-11 transition-all duration-200 rounded-xl group ${
                            isActive 
                              ? "sidebar-item-active shadow-sm" 
                              : "hover:bg-accent/60"
                          }`}
                        >
                          <div className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-200 ${
                            isActive 
                              ? "bg-primary/15" 
                              : "group-hover:bg-accent"
                          }`}>
                            <item.icon className={`h-4 w-4 transition-colors ${
                              isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                            }`} />
                          </div>
                          <span className={`text-[14px] group-data-[collapsible=icon]:hidden ${
                            isActive ? "font-semibold" : "font-medium"
                          }`}>{item.label}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </CollapsibleContent>
            </Collapsible>

            {/* Admin Navigation */}
            {isAdmin && (
              <div className="mt-5 pt-5 border-t border-sidebar-border/60">
                {!isCollapsed && (
                  <p className="px-3 py-2.5 text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-widest">
                    Administration
                  </p>
                )}
                <SidebarMenu className="space-y-1">
                  {adminMenuItems.map((item) => {
                    const isActive =
                      location === item.path ||
                      location.startsWith(item.path + "/");
                    return (
                      <SidebarMenuItem key={item.path}>
                        <SidebarMenuButton
                          isActive={isActive}
                          onClick={() => handleNavigation(item.path)}
                          tooltip={item.label}
                          className={`h-11 transition-all duration-200 rounded-xl group ${
                            isActive 
                              ? "sidebar-item-active shadow-sm" 
                              : "hover:bg-accent/60"
                          }`}
                        >
                          <div className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-200 ${
                            isActive 
                              ? "bg-primary/10" 
                              : "group-hover:bg-accent"
                          }`}>
                            <item.icon
                              className={`h-[18px] w-[18px] transition-colors duration-200 ${
                                isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                              }`}
                            />
                          </div>
                          <span className={`text-[14px] group-data-[collapsible=icon]:hidden ${
                            isActive ? "font-semibold" : "font-medium"
                          }`}>{item.label}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </div>
            )}
          </SidebarContent>

          <SidebarFooter className="p-3 border-t border-sidebar-border">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-sidebar-accent transition-colors w-full text-left group-data-[collapsible=icon]:justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <Avatar className="h-9 w-9 border shrink-0">
                    <AvatarImage src={user?.avatarUrl || undefined} />
                    <AvatarFallback className="text-xs font-medium bg-primary/10 text-primary">
                      {user?.name?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate leading-none">
                        {user?.name || "-"}
                      </p>
                      {isAdmin && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                          Admin
                        </Badge>
                      )}
                      {!isAdmin && isEditor && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          Editor
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-1">
                      {user?.email || "-"}
                    </p>
                  </div>
                  {unreadCount && unreadCount > 0 && (
                    <div className="group-data-[collapsible=icon]:hidden">
                      <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                        {unreadCount}
                      </Badge>
                    </div>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem
                  onClick={() => setLocation("/notifications")}
                  className="cursor-pointer"
                >
                  <Bell className="mr-2 h-4 w-4" />
                  <span>Benachrichtigungen</span>
                  {unreadCount && unreadCount > 0 && (
                    <Badge variant="destructive" className="ml-auto text-[10px] px-1.5 py-0">
                      {unreadCount}
                    </Badge>
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setShowUserProfile(true)}
                  className="cursor-pointer"
                >
                  <User className="mr-2 h-4 w-4" />
                  <span>Mein Profil</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setShowNotificationSettings(true)}
                  className="cursor-pointer"
                >
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Einstellungen</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={logout}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Abmelden</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>
        <div
          className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/20 transition-colors ${
            isCollapsed ? "hidden" : ""
          }`}
          onMouseDown={() => {
            if (isCollapsed) return;
            setIsResizing(true);
          }}
          style={{ zIndex: 50 }}
        />
      </div>

      <SidebarInset className="bg-background">
        {/* Desktop Header with Breadcrumbs */}
        {!isMobile && (
          <div className="flex border-b min-h-14 h-14 shrink-0 items-center justify-between bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:backdrop-blur sticky top-0 z-40">
            <nav className="flex items-center gap-2" aria-label="Breadcrumb">
              {/* Toggle Button für Sidebar */}
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleSidebar}
                className="h-8 w-8 mr-2"
                title={isCollapsed ? "Navigation einblenden" : "Navigation ausblenden"}
              >
                <PanelLeft className="h-4 w-4" />
              </Button>
              {/* Breadcrumb navigation */}
              <span className="font-semibold text-foreground tracking-tight">
                {activeMenuItem?.label ?? "ohwee"}
              </span>
              {location !== "/" && location !== activeMenuItem?.path && (
                <>
                  <span className="text-muted-foreground/50">/</span>
                  <span className="text-sm text-muted-foreground truncate max-w-[200px]">
                    {location.split("/").filter(Boolean).pop()?.replace(/-/g, " ")}
                  </span>
                </>
              )}
            </nav>
            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative">
                    <Star className="h-4 w-4" />
                    <span className="sr-only">Favoriten</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-80 p-3">
                  <h3 className="font-medium mb-3">Favoriten</h3>
                  <FavoritesList />
                </PopoverContent>
              </Popover>
              <NotificationCenter totalCount={totalBadgeCount} />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowShortcuts(true)}
                title="Tastaturkürzel"
              >
                <Keyboard className="h-4 w-4" />
              </Button>
              <ThemeSwitcher />
            </div>
          </div>
        )}
        {/* Mobile Header - mit Safe Area für PWA */}
        {isMobile && (
          <div className="flex border-b items-center justify-between bg-background/95 px-3 backdrop-blur supports-[backdrop-filter]:backdrop-blur sticky top-0 z-40 safe-area-top min-h-14">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="h-9 w-9 rounded-lg" />
              <div className="flex items-center gap-2">
                <Book className="h-5 w-5 text-primary" />
                <span className="font-medium text-foreground">
                  {activeMenuItem?.label ?? "ohwee"}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setLocation("/notifications")}
                className="relative h-9 w-9"
              >
                <Bell className="h-4 w-4" />
                {unreadCount && unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Button>
              <ThemeSwitcher />
            </div>
          </div>
        )}
        <main className="flex-1 p-6 pb-24 md:pb-6 page-transition bg-background min-h-screen overflow-x-hidden overflow-y-auto w-full max-w-full">
          <SwipeNavigationWrapper enabled={isMobile}>
            {children}
          </SwipeNavigationWrapper>
        </main>
        {showShortcuts && <KeyboardShortcutsHelp onClose={() => setShowShortcuts(false)} />}
        <NotificationSettings
          open={showNotificationSettings}
          onOpenChange={setShowNotificationSettings}
        />
        <UserProfile
          open={showUserProfile}
          onOpenChange={setShowUserProfile}
        />
        <Spotlight
          open={spotlightOpen}
          onOpenChange={setSpotlightOpen}
        />
      </SidebarInset>
      
      {/* Mobile Bottom Navigation */}
      <BottomNavigation />
    </>
  );
}
