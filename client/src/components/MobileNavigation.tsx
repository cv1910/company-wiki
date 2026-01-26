import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  Home,
  Book,
  MessageCircle,
  Search,
  Menu,
  Bell,
  CalendarDays,
  ClipboardList,
  Building2,
  Calendar,
} from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Spotlight, useSpotlight } from "@/components/Spotlight";

interface NavItem {
  icon: React.ElementType;
  label: string;
  path: string;
  badge?: number;
}

const mainNavItems: NavItem[] = [
  { icon: Home, label: "Home", path: "/" },
  { icon: Search, label: "AI Suche", path: "/search" },
  { icon: MessageCircle, label: "Taps", path: "/taps" },
  { icon: CalendarDays, label: "Kalender", path: "/calendar" },
  { icon: Menu, label: "Mehr", path: "#menu" },
];

const menuItems = [
  { icon: Book, label: "How to Work", path: "/wiki" },
  { icon: ClipboardList, label: "Einsatzplan POS", path: "/scheduling" },
  { icon: Building2, label: "Team", path: "/orgchart" },
  { icon: Calendar, label: "Urlaub", path: "/leave" },
  { icon: Bell, label: "Benachrichtigungen", path: "/notifications" },
];

export function MobileNavigation() {
  const [location, navigate] = useLocation();
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const { open: spotlightOpen, setOpen: setSpotlightOpen } = useSpotlight();

  // Fetch unread notification count
  const { data: unreadCount } = trpc.notifications.unreadCount.useQuery(undefined, {
    refetchInterval: 30000,
  });

  const handleNavClick = (path: string) => {
    if (path === "#menu") {
      setMenuOpen(true);
      return;
    }
    navigate(path);
    setMenuOpen(false);
  };

  const isActive = (path: string) => {
    if (path === "/") return location === "/";
    return location.startsWith(path);
  };

  return (
    <>
      {/* Bottom Tab Bar - Premium Design with Gradient Active States */}
      <nav 
        className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/30 pb-safe md:hidden shadow-[0_-4px_16px_rgba(0,0,0,0.08)] bg-background" 
      >
        <div className="flex items-center justify-around h-16 px-2">
          {mainNavItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <button
                key={item.path}
                onClick={() => handleNavClick(item.path)}
                className={cn(
                  "flex flex-col items-center justify-center flex-1 py-1.5 transition-colors",
                  active 
                    ? "text-primary" 
                    : "text-muted-foreground"
                )}
              >
                <div className="relative h-5 flex items-center justify-center">
                  <Icon className="h-5 w-5" strokeWidth={active ? 2.5 : 2} />
                  {item.badge && item.badge > 0 && (
                    <span className="absolute -top-1 -right-2 flex items-center justify-center min-w-[14px] h-3.5 px-1 text-[9px] font-bold text-white rounded-full bg-primary">
                      {item.badge > 9 ? "9+" : item.badge}
                    </span>
                  )}
                </div>
                <span className={cn(
                  "text-[10px] mt-0.5 whitespace-nowrap",
                  active ? "font-semibold" : "font-medium"
                )}>
                  {item.label}
                </span>
              </button>
            );
          })}

          {/* Menu Button */}
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <button className="flex flex-col items-center justify-center flex-1 py-1.5 text-muted-foreground transition-colors relative">
                <div className="h-5 flex items-center justify-center">
                  <Menu className="h-5 w-5" strokeWidth={2} />
                </div>
                <span className="text-[10px] mt-0.5 font-medium">Mehr</span>
                {unreadCount && unreadCount > 0 && (
                  <span className="absolute top-0 right-3 h-2 w-2 rounded-full bg-destructive" />
                )}
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[320px] p-0 border-l-0 shadow-2xl">
              <div className="flex flex-col h-full">
                {/* User Header - Premium Gradient */}
                <div className="p-5 border-b border-border/30 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-14 w-14 ring-2 ring-primary/20 shadow-lg">
                      <AvatarImage src={user?.avatarUrl || ""} />
                      <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-white font-bold text-lg">
                        {user?.name?.charAt(0) || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-lg truncate">{user?.name}</p>
                      <p className="text-sm text-muted-foreground truncate">{user?.email}</p>
                    </div>
                  </div>
                </div>

                {/* Menu Items - Premium Style */}
                <div className="flex-1 overflow-y-auto py-3 px-2">
                  {menuItems.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.path);
                    const showBadge = item.path === "/notifications" && unreadCount && unreadCount > 0;
                    return (
                      <button
                        key={item.path}
                        onClick={() => handleNavClick(item.path)}
                        className={cn(
                          "w-full flex items-center gap-3 px-4 py-3.5 transition-all duration-200 rounded-xl mb-1",
                          active
                            ? "bg-gradient-to-r from-primary/15 to-primary/5 text-primary shadow-sm"
                            : "text-foreground hover:bg-accent/60"
                        )}
                      >
                        <div className={cn(
                          "flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-200",
                          active 
                            ? "bg-primary/15" 
                            : "bg-muted/50"
                        )}>
                          <Icon className={cn(
                            "h-5 w-5 transition-colors",
                            active ? "text-primary" : "text-muted-foreground"
                          )} />
                        </div>
                        <span className={cn(
                          "flex-1 text-left transition-all",
                          active ? "font-semibold" : "font-medium"
                        )}>{item.label}</span>
                        {showBadge && (
                          <span className="h-6 min-w-6 px-2 rounded-full bg-gradient-to-r from-destructive to-destructive/80 text-[11px] font-bold text-destructive-foreground flex items-center justify-center shadow-md">
                            {unreadCount > 99 ? "99+" : unreadCount}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Logout Button - Premium */}
                <div className="p-4 border-t border-border/30">
                  <Button
                    variant="outline"
                    className="w-full h-12 rounded-xl font-semibold hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-all duration-200"
                    onClick={() => {
                      logout();
                      setMenuOpen(false);
                    }}
                  >
                    Abmelden
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>

      {/* Spotlight Dialog */}
      <Spotlight open={spotlightOpen} onOpenChange={setSpotlightOpen} />

      {/* Bottom Padding for content - matches nav height */}
      <div className="h-16 md:hidden" />
    </>
  );
}
