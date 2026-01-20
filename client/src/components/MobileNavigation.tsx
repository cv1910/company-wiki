import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  Home,
  Book,
  Mail,
  Search,
  Menu,
  Bell,
  CalendarDays,
  ClipboardList,
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
  { icon: Book, label: "Wiki", path: "/wiki" },
  { icon: Mail, label: "Ohweees", path: "/ohweees" },
  { icon: CalendarDays, label: "Kalender", path: "/calendar" },
];

const menuItems = [
  { icon: Home, label: "Home", path: "/" },
  { icon: Book, label: "Wiki", path: "/wiki" },
  { icon: ClipboardList, label: "SOPs", path: "/sops" },
  { icon: Mail, label: "Ohweees", path: "/ohweees" },
  { icon: CalendarDays, label: "Kalender", path: "/calendar" },
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
    navigate(path);
    setMenuOpen(false);
  };

  const isActive = (path: string) => {
    if (path === "/") return location === "/";
    return location.startsWith(path);
  };

  return (
    <>
      {/* Bottom Tab Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-xl border-t border-border/50 pb-safe md:hidden">
        <div className="flex items-center justify-around h-16 px-2">
          {mainNavItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <button
                key={item.path}
                onClick={() => handleNavClick(item.path)}
                className={cn(
                  "flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors",
                  active ? "text-primary" : "text-muted-foreground"
                )}
              >
                <div className="relative">
                  <Icon className={cn("h-6 w-6", active && "stroke-[2.5px]")} />
                  {item.badge && item.badge > 0 && (
                    <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground flex items-center justify-center">
                      {item.badge > 9 ? "9+" : item.badge}
                    </span>
                  )}
                </div>
                <span className={cn("text-[10px] font-medium", active && "font-semibold")}>
                  {item.label}
                </span>
              </button>
            );
          })}

          {/* Search Button */}
          <button
            onClick={() => setSpotlightOpen(true)}
            className="flex flex-col items-center justify-center flex-1 h-full gap-1 text-muted-foreground transition-colors"
          >
            <Search className="h-6 w-6" />
            <span className="text-[10px] font-medium">Suche</span>
          </button>

          {/* Menu Button */}
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <button className="flex flex-col items-center justify-center flex-1 h-full gap-1 text-muted-foreground transition-colors relative">
                <Menu className="h-6 w-6" />
                <span className="text-[10px] font-medium">Mehr</span>
                {unreadCount && unreadCount > 0 && (
                  <span className="absolute top-2 right-1/4 h-2 w-2 rounded-full bg-destructive" />
                )}
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] p-0">
              <div className="flex flex-col h-full">
                {/* User Header */}
                <div className="p-4 border-b border-border/50 bg-muted/30">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={user?.avatarUrl || ""} />
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                        {user?.name?.charAt(0) || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{user?.name}</p>
                      <p className="text-sm text-muted-foreground truncate">{user?.email}</p>
                    </div>
                  </div>
                </div>

                {/* Menu Items */}
                <div className="flex-1 overflow-y-auto py-2">
                  {menuItems.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.path);
                    const showBadge = item.path === "/notifications" && unreadCount && unreadCount > 0;
                    return (
                      <button
                        key={item.path}
                        onClick={() => handleNavClick(item.path)}
                        className={cn(
                          "w-full flex items-center gap-3 px-4 py-3 transition-colors",
                          active
                            ? "bg-primary/10 text-primary"
                            : "text-foreground hover:bg-accent"
                        )}
                      >
                        <Icon className="h-5 w-5" />
                        <span className="flex-1 text-left font-medium">{item.label}</span>
                        {showBadge && (
                          <span className="h-5 min-w-5 px-1.5 rounded-full bg-destructive text-[11px] font-medium text-destructive-foreground flex items-center justify-center">
                            {unreadCount > 99 ? "99+" : unreadCount}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Logout Button */}
                <div className="p-4 border-t border-border/50">
                  <Button
                    variant="outline"
                    className="w-full"
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

      {/* Bottom Padding for content */}
      <div className="h-16 md:hidden" />
    </>
  );
}
