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
  Calendar,
  BookOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/components/ui/sidebar";

interface NavItem {
  icon: typeof Home;
  label: string;
  path: string;
  badgeType?: "taps" | "tasks";
}

// Navigation Items: Home, AI Suche, Taps, Kalender, Aufgaben, How to Work, Mehr
const navItems: NavItem[] = [
  { icon: Home, label: "Home", path: "/" },
  { icon: Search, label: "AI Suche", path: "/search" },
  { icon: MessageCircle, label: "Taps", path: "/taps", badgeType: "taps" },
  { icon: Calendar, label: "Kalender", path: "/calendar" },
  { icon: CheckSquare, label: "Aufgaben", path: "/aufgaben", badgeType: "tasks" },
  { icon: BookOpen, label: "How to Work", path: "/how-to-work" },
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
    <nav 
      className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border"
      style={{ 
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      <div className="flex items-stretch h-14">
        {navItems.map((item) => {
          const isActive = location === item.path || 
            (item.path !== "/" && location.startsWith(item.path));
          const badgeCount = getBadgeCount(item.badgeType);
          
          return (
            <button
              key={item.path}
              onClick={() => handleNavigation(item.path, isActive)}
              className={cn(
                "flex flex-col items-center justify-center flex-1 py-1.5 transition-colors",
                isActive 
                  ? "text-primary" 
                  : "text-muted-foreground"
              )}
            >
              <div className="relative h-5 flex items-center justify-center">
                <item.icon className="h-5 w-5" strokeWidth={isActive ? 2.5 : 2} />
                {badgeCount > 0 && (
                  <span className={cn(
                    "absolute -top-1 -right-2 flex items-center justify-center min-w-[14px] h-3.5 px-1 text-[9px] font-bold text-white rounded-full",
                    item.badgeType === "tasks" ? "bg-amber-500" : "bg-primary"
                  )}>
                    {badgeCount > 99 ? "99+" : badgeCount}
                  </span>
                )}
              </div>
              <span className={cn(
                "text-[10px] mt-0.5 whitespace-nowrap",
                isActive ? "font-semibold" : "font-medium"
              )}>
                {item.label}
              </span>
            </button>
          );
        })}

        {/* Menu Button */}
        <button
          onClick={handleMenuToggle}
          className="flex flex-col items-center justify-center flex-1 py-1.5 text-muted-foreground transition-colors"
        >
          <div className="h-5 flex items-center justify-center">
            <Menu className="h-5 w-5" strokeWidth={2} />
          </div>
          <span className="text-[10px] mt-0.5 font-medium">Mehr</span>
        </button>
      </div>
    </nav>
  );
}
