import { useLocation } from "wouter";
import { useIsMobile } from "@/hooks/useMobile";
import { useHapticFeedback } from "@/hooks/useHapticFeedback";
import { trpc } from "@/lib/trpc";
import { 
  Home, 
  Search, 
  MessageCircle, 
  CheckSquare, 
  Menu,
  Plus,
  Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface NavItem {
  icon: typeof Home;
  label: string;
  path: string;
  badgeType?: "taps" | "tasks";
}

// Home, AI Suche, Taps, Kalender, Aufgaben
const navItems: NavItem[] = [
  { icon: Home, label: "Home", path: "/" },
  { icon: Search, label: "AI Suche", path: "/search" },
  { icon: MessageCircle, label: "Taps", path: "/taps", badgeType: "taps" },
  { icon: Calendar, label: "Kalender", path: "/calendar" },
  { icon: CheckSquare, label: "Aufgaben", path: "/aufgaben", badgeType: "tasks" },
];

const quickActions = [
  { label: "Neue Aufgabe", path: "/aufgaben?action=new", icon: CheckSquare },
  { label: "Neuer Termin", path: "/calendar?action=new", icon: Calendar },
  { label: "Urlaub beantragen", path: "/urlaub?action=new", icon: Calendar },
];

export function BottomNavigation() {
  const isMobile = useIsMobile();
  const [location, setLocation] = useLocation();
  const { toggleSidebar } = useSidebar();
  const { lightTap, selection, impact } = useHapticFeedback();
  
  // Fetch unread Taps count
  const { data: unreadTapsCount } = trpc.ohweees.unreadCount.useQuery(undefined, {
    refetchInterval: 30000,
    staleTime: 10000,
  });

  // Fetch open tasks count
  const { data: openTasksCount } = trpc.tasks.openCount.useQuery(undefined, {
    refetchInterval: 60000,
    staleTime: 30000,
  });

  if (!isMobile) {
    return null;
  }

  const handleNavigation = (path: string, isActive: boolean) => {
    if (!isActive) {
      impact();
    } else {
      lightTap();
    }
    setLocation(path);
  };

  const handleMenuToggle = () => {
    selection();
    toggleSidebar();
  };

  const getBadgeCount = (badgeType?: "taps" | "tasks") => {
    if (badgeType === "taps") return unreadTapsCount || 0;
    if (badgeType === "tasks") return openTasksCount || 0;
    return 0;
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border/50 safe-area-bottom">
      <div className="flex items-center justify-around h-16 px-1">
        {navItems.map((item) => {
          const isActive = location === item.path || 
            (item.path !== "/" && location.startsWith(item.path));
          const badgeCount = getBadgeCount(item.badgeType);
          
          return (
            <button
              key={item.path}
              onClick={() => handleNavigation(item.path, isActive)}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full py-2 gap-0.5 transition-colors",
                isActive 
                  ? "text-primary" 
                  : "text-muted-foreground active:text-foreground"
              )}
            >
              <div className="relative">
                <item.icon className={cn(
                  "h-6 w-6 transition-all",
                  isActive ? "stroke-[2px]" : "stroke-[1.5px]"
                )} />
                {badgeCount > 0 && (
                  <span className={cn(
                    "absolute -top-1 -right-1.5 flex items-center justify-center min-w-[16px] h-4 px-1 text-[9px] font-bold text-white rounded-full",
                    item.badgeType === "tasks" ? "bg-amber-500" : "bg-primary"
                  )}>
                    {badgeCount > 99 ? "99+" : badgeCount}
                  </span>
                )}
              </div>
              <span className={cn(
                "text-[10px]",
                isActive ? "font-semibold" : "font-medium"
              )}>
                {item.label}
              </span>
            </button>
          );
        })}

        {/* Quick Action Button */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button 
              onClick={() => selection()}
              className="flex flex-col items-center justify-center flex-1 h-full py-2 gap-0.5 text-muted-foreground active:text-foreground transition-colors"
            >
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground">
                <Plus className="h-5 w-5" />
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="top" className="w-48 mb-2">
            {quickActions.map((action) => (
              <DropdownMenuItem
                key={action.path}
                onClick={() => handleNavigation(action.path, false)}
                className="cursor-pointer"
              >
                <action.icon className="h-4 w-4 mr-2" />
                {action.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Menu Button */}
        <button
          onClick={handleMenuToggle}
          className="flex flex-col items-center justify-center flex-1 h-full py-2 gap-0.5 text-muted-foreground active:text-foreground transition-colors"
        >
          <Menu className="h-6 w-6 stroke-[1.5px]" />
          <span className="text-[10px] font-medium">Mehr</span>
        </button>
      </div>
    </nav>
  );
}
