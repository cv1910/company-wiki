import { useLocation } from "wouter";
import { useIsMobile } from "@/hooks/useMobile";
import { useHapticFeedback } from "@/hooks/useHapticFeedback";
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
}

// Geändert zu: Home, AI Suche, Taps, Aufgaben
const navItems: NavItem[] = [
  { icon: Home, label: "Home", path: "/" },
  { icon: Search, label: "AI Suche", path: "/search" },
  { icon: MessageCircle, label: "Taps", path: "/taps" },
  { icon: CheckSquare, label: "Aufgaben", path: "/aufgaben" },
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
  const { lightTap, selection } = useHapticFeedback();

  if (!isMobile) {
    return null;
  }

  const handleNavigation = (path: string) => {
    lightTap();
    setLocation(path);
  };

  const handleMenuToggle = () => {
    selection();
    toggleSidebar();
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-lg border-t border-border safe-area-bottom">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const isActive = location === item.path || 
            (item.path !== "/" && location.startsWith(item.path));
          
          return (
            <button
              key={item.path}
              onClick={() => handleNavigation(item.path)}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full py-1 transition-colors",
                isActive 
                  ? "text-primary" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <item.icon className={cn(
                "h-5 w-5 mb-0.5 transition-transform",
                isActive && "scale-110"
              )} />
              <span className={cn(
                "text-[10px] font-medium",
                isActive && "font-semibold"
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
              className="flex flex-col items-center justify-center flex-1 h-full py-1 text-muted-foreground hover:text-foreground transition-colors"
            >
              <div className="relative">
                <div className="absolute -inset-1 bg-primary/20 rounded-full blur-sm" />
                <div className="relative flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground">
                  <Plus className="h-5 w-5" />
                </div>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="top" className="w-48 mb-2">
            {quickActions.map((action) => (
              <DropdownMenuItem
                key={action.path}
                onClick={() => handleNavigation(action.path)}
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
          className="flex flex-col items-center justify-center flex-1 h-full py-1 text-muted-foreground hover:text-foreground transition-colors"
        >
          <Menu className="h-5 w-5 mb-0.5" />
          <span className="text-[10px] font-medium">Mehr</span>
        </button>
      </div>
    </nav>
  );
}
