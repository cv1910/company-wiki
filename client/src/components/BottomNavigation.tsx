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
  BookOpen,
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

// Geändert zu: Home, AI Suche, Taps, Kalender, Aufgaben, How to Work
const navItems: NavItem[] = [
  { icon: Home, label: "Home", path: "/" },
  { icon: Search, label: "AI Suche", path: "/search" },
  { icon: MessageCircle, label: "Taps", path: "/taps", badgeType: "taps" },
  { icon: Calendar, label: "Kalender", path: "/calendar" },
  { icon: CheckSquare, label: "Aufgaben", path: "/aufgaben", badgeType: "tasks" },
  { icon: BookOpen, label: "How to Work", path: "/how-to-work" },
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
    refetchInterval: 60000, // Refresh every minute
    staleTime: 30000,
  });

  if (!isMobile) {
    return null;
  }

  const handleNavigation = (path: string, isActive: boolean) => {
    // Nur Haptic wenn nicht bereits auf der Seite
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
    <nav 
      className="fixed bottom-0 left-0 right-0 z-[9999] border-t border-border safe-area-bottom overflow-visible"
      style={{ 
        backgroundColor: 'var(--background)',
      }}
    >
      {/* Solider Hintergrund-Blocker - deckt ALLES ab was dahinter liegt */}
      <div 
        className="absolute pointer-events-none"
        style={{ 
          backgroundColor: 'var(--background)', 
          zIndex: 1,
          top: '-100px',
          bottom: '-100px',
          left: '-100vw',
          right: '-100vw',
          width: '300vw',
        }} 
      />
      {/* Zweite Schicht für zusätzliche Sicherheit */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{ 
          backgroundColor: 'var(--background)', 
          zIndex: 2,
        }} 
      />
      <div className="relative flex items-center justify-around h-16 px-2" style={{ zIndex: 3 }}>
        {navItems.map((item) => {
          const isActive = location === item.path || 
            (item.path !== "/" && location.startsWith(item.path));
          const badgeCount = getBadgeCount(item.badgeType);
          
          return (
            <button
              key={item.path}
              onClick={() => handleNavigation(item.path, isActive)}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full py-1 transition-colors relative",
                isActive 
                  ? "text-primary" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <div className="relative">
                <item.icon className={cn(
                  "h-5 w-5 mb-0.5 transition-transform",
                  isActive && "scale-110"
                )} />
                {badgeCount > 0 && (
                  <span className={cn(
                    "absolute -top-1.5 -right-1.5 flex items-center justify-center min-w-[16px] h-4 px-1 text-[10px] font-bold text-white rounded-full",
                    item.badgeType === "tasks" ? "bg-amber-500" : "bg-primary"
                  )}>
                    {badgeCount > 99 ? "99+" : badgeCount}
                  </span>
                )}
              </div>
              <span className={cn(
                "text-[10px] font-medium",
                isActive && "font-semibold"
              )}>
                {item.label}
              </span>
            </button>
          );
        })}

        {/* Menu Button */}
        <button
          onClick={handleMenuToggle}
          className="flex flex-col items-center justify-center flex-1 h-full py-1 text-muted-foreground hover:text-foreground transition-colors"
        >
          <Menu className="h-5 w-5 mb-0.5" />
          <span className="text-[10px] font-medium">Mehr</span>
        </button>
      </div>
    </nav>
  );
}
