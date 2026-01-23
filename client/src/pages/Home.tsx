import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { 
  Book, 
  ClipboardList, 
  FileText, 
  MessageCircle, 
  Plus, 
  Search,
  Calendar,
  Bell,
  Megaphone,
  AlertTriangle,
  CheckCircle,
  Info,
  ArrowRight,
  Sparkles,
  Users,
  FolderOpen,
  GraduationCap,
  Settings2,
  Eye,
  EyeOff,
  RotateCcw,
  GripVertical,
  X,
  Star,
  Maximize2,
  Minimize2,
  Square,
  Palmtree,
  MessageSquarePlus,
  ClipboardCheck
} from "lucide-react";
import { useLocation } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useMemo, useCallback } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { PullToRefresh } from "@/components/PullToRefresh";

// Widget size options
type WidgetSize = "small" | "medium" | "large";

const SIZE_LABELS: Record<WidgetSize, string> = {
  small: "Klein",
  medium: "Mittel",
  large: "Groß",
};

const SIZE_ICONS: Record<WidgetSize, typeof Minimize2> = {
  small: Minimize2,
  medium: Square,
  large: Maximize2,
};

// Widget definitions with size support - vereinfacht für fokussiertes Dashboard
const WIDGET_DEFINITIONS = {
  welcomeHero: { id: "welcomeHero", label: "Willkommens-Banner", description: "Personalisierte Begrüßung mit AI-Suche", supportsResize: false },
  announcements: { id: "announcements", label: "Ankündigungen", description: "Angepinnte Unternehmens-Mitteilungen", supportsResize: true },
  // Folgende Widgets sind ausgeblendet, können aber über Einstellungen aktiviert werden
  navigation: { id: "navigation", label: "Navigation", description: "Schnellzugriff auf Bereiche", supportsResize: false },
  stats: { id: "stats", label: "Statistiken", description: "Übersicht der Inhalte", supportsResize: false },
  recentArticles: { id: "recentArticles", label: "Kürzlich aktualisiert", description: "Neueste Artikel", supportsResize: true },
  activityFeed: { id: "activityFeed", label: "Aktivitäten", description: "Letzte Änderungen", supportsResize: true },
  favorites: { id: "favorites", label: "Favoriten", description: "Deine Lieblingsartikel", supportsResize: true },
  onboardingProgress: { id: "onboardingProgress", label: "Onboarding-Fortschritt", description: "Dein Einarbeitungsstatus", supportsResize: true },
};

type WidgetId = keyof typeof WIDGET_DEFINITIONS;

// Sortable Widget Item Component with Size Selection
function SortableWidgetItem({ 
  id, 
  widget, 
  isVisible, 
  currentSize,
  onToggle,
  onSizeChange
}: { 
  id: string; 
  widget: { label: string; description: string; supportsResize: boolean }; 
  isVisible: boolean;
  currentSize: WidgetSize;
  onToggle: (checked: boolean) => void;
  onSizeChange: (size: WidgetSize) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const sizes: WidgetSize[] = ["small", "medium", "large"];

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center justify-between py-3 px-2 rounded-lg ${isDragging ? 'bg-muted/50' : 'hover:bg-muted/30'} transition-colors`}
    >
      <div className="flex items-center gap-3">
        <button
          {...attributes}
          {...listeners}
          className="p-1.5 hover:bg-muted rounded cursor-grab active:cursor-grabbing touch-none"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </button>
        <div>
          <Label htmlFor={id} className="font-medium cursor-pointer">
            {widget.label}
          </Label>
          <p className="text-xs text-muted-foreground">{widget.description}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {widget.supportsResize && isVisible && (
          <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-0.5">
            {sizes.map((size) => {
              const Icon = SIZE_ICONS[size];
              return (
                <button
                  key={size}
                  onClick={() => onSizeChange(size)}
                  className={`p-1.5 rounded transition-colors ${
                    currentSize === size 
                      ? 'bg-primary text-primary-foreground' 
                      : 'hover:bg-muted text-muted-foreground'
                  }`}
                  title={SIZE_LABELS[size]}
                >
                  <Icon className="h-3.5 w-3.5" />
                </button>
              );
            })}
          </div>
        )}
        <Switch
          id={id}
          checked={isVisible}
          onCheckedChange={onToggle}
        />
      </div>
    </div>
  );
}

export default function Home() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const isEditor = user?.role === "editor" || user?.role === "admin";
  const isAdmin = user?.role === "admin";
  const [settingsOpen, setSettingsOpen] = useState(false);

  const { data: stats, isLoading: statsLoading } = trpc.dashboard.stats.useQuery();
  const { data: recentArticles, isLoading: articlesLoading } = trpc.dashboard.recentArticles.useQuery();
  const { data: recentActivity, isLoading: activityLoading } = trpc.dashboard.recentActivity.useQuery();
  const { data: announcements, isLoading: announcementsLoading } = trpc.announcements.getActive.useQuery();
  const { data: favorites, isLoading: favoritesLoading } = trpc.favorites.list.useQuery();
  const { data: assignments, isLoading: assignmentsLoading } = trpc.assignments.getMyAssignments.useQuery();
  
  const { data: dashboardSettings, isLoading: settingsLoading } = trpc.dashboardSettings.get.useQuery();
  const utils = trpc.useUtils();
  
  const updateVisibility = trpc.dashboardSettings.updateVisibility.useMutation({
    onSuccess: () => {
      utils.dashboardSettings.get.invalidate();
    },
  });
  
  const updateOrder = trpc.dashboardSettings.updateOrder.useMutation({
    onSuccess: () => {
      utils.dashboardSettings.get.invalidate();
    },
  });
  
  const resetSettings = trpc.dashboardSettings.reset.useMutation({
    onSuccess: () => {
      utils.dashboardSettings.get.invalidate();
      toast.success("Dashboard-Einstellungen zurückgesetzt");
    },
  });

  const updateSize = trpc.dashboardSettings.updateSize.useMutation({
    onSuccess: () => {
      utils.dashboardSettings.get.invalidate();
    },
  });

  // Get widget visibility settings - Default: nur Willkommen und Ankündigungen
  const widgetVisibility = useMemo(() => ({
    welcomeHero: dashboardSettings?.showWelcomeHero ?? true,
    announcements: dashboardSettings?.showAnnouncements ?? true,
    navigation: dashboardSettings?.showNavigation ?? false, // Default ausgeblendet
    stats: dashboardSettings?.showStats ?? false, // Default ausgeblendet
    recentArticles: dashboardSettings?.showRecentArticles ?? false, // Default ausgeblendet
    activityFeed: dashboardSettings?.showActivityFeed ?? false, // Default ausgeblendet
    favorites: dashboardSettings?.showFavorites ?? false, // Default ausgeblendet
    onboardingProgress: dashboardSettings?.showOnboardingProgress ?? false, // Default ausgeblendet
  }), [dashboardSettings]);

  // Get widget order
  const widgetOrder = useMemo(() => {
    const order = dashboardSettings?.widgetOrder as string[] | undefined;
    if (order && Array.isArray(order)) {
      return order;
    }
    return Object.keys(WIDGET_DEFINITIONS);
  }, [dashboardSettings]);

  // Get widget sizes
  const widgetSizes = useMemo(() => {
    const sizes = dashboardSettings?.widgetSizes as Record<string, WidgetSize> | undefined;
    return sizes || {};
  }, [dashboardSettings]);

  const getWidgetSize = (widgetId: string): WidgetSize => {
    return widgetSizes[widgetId] || "medium";
  };

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleToggleWidget = (widgetId: string, visible: boolean) => {
    updateVisibility.mutate({ widgetId, visible });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const oldIndex = widgetOrder.indexOf(active.id as string);
      const newIndex = widgetOrder.indexOf(over.id as string);
      const newOrder = arrayMove(widgetOrder, oldIndex, newIndex);
      updateOrder.mutate({ widgetOrder: newOrder });
    }
  };

  const handleResetSettings = () => {
    resetSettings.mutate();
    setSettingsOpen(false);
  };

  const getAnnouncementIcon = (type: string) => {
    switch (type) {
      case "urgent": return <AlertTriangle className="h-5 w-5" />;
      case "warning": return <Bell className="h-5 w-5" />;
      case "success": return <CheckCircle className="h-5 w-5" />;
      default: return <Info className="h-5 w-5" />;
    }
  };

  const getAnnouncementStyle = (type: string) => {
    switch (type) {
      case "urgent": return "bg-red-500/10 border-red-500/20 text-red-700 dark:text-red-400";
      case "warning": return "bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-400";
      case "success": return "bg-green-500/10 border-green-500/20 text-green-700 dark:text-green-400";
      default: return "bg-blue-500/10 border-blue-500/20 text-blue-700 dark:text-blue-400";
    }
  };

  const navigationItems = [
    { 
      icon: Sparkles, 
      label: "AI Suche", 
      description: "Finde alles mit KI-Unterstützung",
      path: "/search", 
      color: "from-purple-500 to-pink-500",
      bgColor: "bg-purple-500/10",
      textColor: "text-purple-600 dark:text-purple-400"
    },
    { 
      icon: Book, 
      label: "Wissensdatenbank", 
      description: "Wiki & SOPs durchsuchen",
      path: "/wiki", 
      color: "from-blue-500 to-blue-600",
      bgColor: "bg-blue-500/10",
      textColor: "text-blue-600 dark:text-blue-400"
    },
    { 
      icon: GraduationCap, 
      label: "Onboarding", 
      description: "Einarbeitung & Training",
      path: "/onboarding", 
      color: "from-indigo-500 to-indigo-600",
      bgColor: "bg-indigo-500/10",
      textColor: "text-indigo-600 dark:text-indigo-400"
    },
    { 
      icon: Calendar, 
      label: "Kalender", 
      description: "Termine & Urlaub",
      path: "/calendar", 
      color: "from-orange-500 to-orange-600",
      bgColor: "bg-orange-500/10",
      textColor: "text-orange-600 dark:text-orange-400"
    },
    { 
      icon: Users, 
      label: "Team", 
      description: "Kollegen & Organigramm",
      path: "/team", 
      color: "from-green-500 to-green-600",
      bgColor: "bg-green-500/10",
      textColor: "text-green-600 dark:text-green-400"
    },
    { 
      icon: MessageCircle, 
      label: "Taps", 
      description: "Schnelle Nachrichten",
      path: "/taps", 
      color: "from-pink-500 to-pink-600",
      bgColor: "bg-pink-500/10",
      textColor: "text-pink-600 dark:text-pink-400"
    },
  ];

  // Widget components
  const [searchQuery, setSearchQuery] = useState("");
  
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setLocation(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  // Personalisierte Begrüßung basierend auf Tageszeit
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return "Guten Morgen";
    if (hour >= 12 && hour < 18) return "Guten Tag";
    return "Guten Abend";
  };

  const renderWelcomeHero = () => (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/15 via-primary/8 to-secondary/5 border border-primary/15 p-5 sm:p-8 md:p-10 shadow-lg">
      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-primary/20 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-secondary-accent/10 to-transparent rounded-full blur-2xl translate-y-1/2 -translate-x-1/4" />
      
      <div className="relative">
        <div className="flex flex-col gap-5 sm:gap-6">
          <div>
            <div className="flex items-center gap-2.5 mb-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/15">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <span className="text-sm font-semibold text-primary tracking-wide">ohwee</span>
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
              {getGreeting()}, {user?.name?.split(" ")[0] || "Benutzer"}!
            </h1>
            <p className="text-muted-foreground mt-2 sm:mt-3 max-w-xl text-sm sm:text-base leading-relaxed">
              Hier findest du alle wichtigen Informationen, Prozesse und Anleitungen für deinen Arbeitsalltag.
            </p>
          </div>
          
          {/* AI Search Field - Mobile optimiert */}
          <form onSubmit={handleSearch} className="relative w-full">
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-xl sm:rounded-2xl blur-xl opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-300" />
              <div className="relative flex flex-col sm:flex-row sm:items-center bg-background/80 backdrop-blur-sm border border-border/50 rounded-xl sm:rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 focus-within:ring-2 focus-within:ring-primary/30 focus-within:border-primary/50 overflow-hidden">
                <div className="flex items-center flex-1">
                  <div className="flex items-center gap-2 pl-4 pr-2">
                    <div className="flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-br from-purple-500/10 to-pink-500/10">
                      <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-purple-500" />
                    </div>
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Frag mich alles..."
                    className="flex-1 h-12 sm:h-14 bg-transparent border-0 text-sm sm:text-base placeholder:text-muted-foreground/60 focus:outline-none focus:ring-0 min-w-0"
                  />
                </div>
                <Button 
                  type="submit"
                  size="sm"
                  className="m-2 rounded-lg sm:rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-4 sm:px-5 h-9 sm:h-10 font-medium text-sm shrink-0"
                >
                  <Search className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Suchen</span>
                </Button>
              </div>
            </div>
            <p className="text-[10px] sm:text-xs text-muted-foreground/70 mt-2 ml-1 hidden sm:block">
              Tipp: Drücke <kbd className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono text-[10px]">Cmd/Ctrl + K</kbd> für die Schnellsuche
            </p>
          </form>
          
          {/* Schnellaktions-Buttons - Mobile optimiert */}
          <div className="flex flex-wrap gap-2 sm:gap-3 mt-1 sm:mt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLocation("/leave/new")}
              className="rounded-lg sm:rounded-xl border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30 hover:bg-green-100 dark:hover:bg-green-900/50 text-green-700 dark:text-green-400 gap-1.5 sm:gap-2 text-xs sm:text-sm h-8 sm:h-9 px-3 sm:px-4"
            >
              <Palmtree className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              Urlaub
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLocation("/taps/new")}
              className="rounded-lg sm:rounded-xl border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-400 gap-1.5 sm:gap-2 text-xs sm:text-sm h-8 sm:h-9 px-3 sm:px-4"
            >
              <MessageSquarePlus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              Chat
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLocation("/calendar?new=true")}
              className="rounded-lg sm:rounded-xl border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/30 hover:bg-orange-100 dark:hover:bg-orange-900/50 text-orange-700 dark:text-orange-400 gap-1.5 sm:gap-2 text-xs sm:text-sm h-8 sm:h-9 px-3 sm:px-4"
            >
              <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              Termin
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLocation("/aufgaben/new")}
              className="rounded-lg sm:rounded-xl border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/30 hover:bg-purple-100 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-400 gap-1.5 sm:gap-2 text-xs sm:text-sm h-8 sm:h-9 px-3 sm:px-4"
            >
              <ClipboardCheck className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              Aufgabe
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderAnnouncements = () => {
    if (announcementsLoading || !announcements || announcements.length === 0) return null;
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Megaphone className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Ankündigungen</h2>
        </div>
        <div className="space-y-3">
          {announcements.map((announcement) => (
            <div
              key={announcement.id}
              className={`relative overflow-hidden rounded-xl border p-4 transition-all hover:shadow-md ${getAnnouncementStyle(announcement.type)}`}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  {getAnnouncementIcon(announcement.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold">{announcement.title}</h3>
                    {announcement.isPinned && (
                      <Badge variant="secondary" className="text-xs">Angepinnt</Badge>
                    )}
                  </div>
                  <p className="text-sm opacity-90">{announcement.content}</p>
                  <p className="text-xs opacity-60 mt-2">
                    {formatDistanceToNow(new Date(announcement.createdAt), {
                      addSuffix: true,
                      locale: de,
                    })}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderNavigation = () => (
    <div className="space-y-5">
      <h2 className="text-xl font-bold tracking-tight">Navigation</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {navigationItems.map((item) => (
          <Card
            key={item.path}
            className="group cursor-pointer card-shadow hover:shadow-xl transition-all duration-300 hover:-translate-y-2 overflow-hidden rounded-xl"
            onClick={() => setLocation(item.path)}
          >
            <CardContent className="p-5 text-center">
              <div className={`mx-auto w-14 h-14 rounded-2xl bg-gradient-to-br ${item.color} flex items-center justify-center mb-4 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg`}>
                <item.icon className="h-7 w-7 text-white" />
              </div>
              <h3 className="font-semibold text-sm">{item.label}</h3>
              <p className="text-xs text-muted-foreground mt-1.5 line-clamp-1">{item.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  const renderStats = () => (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
      <Card 
        className="cursor-pointer card-shadow hover:shadow-xl transition-all duration-300 group rounded-xl overflow-hidden"
        onClick={() => setLocation("/wiki")}
      >
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-muted-foreground">Artikel</div>
              <div className="text-3xl font-bold mt-2 tracking-tight">
                {statsLoading ? <Skeleton className="h-9 w-16" /> : stats?.articleCount || 0}
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 shadow-lg">
              <FileText className="h-6 w-6 text-white" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card 
        className="cursor-pointer card-shadow hover:shadow-xl transition-all duration-300 group rounded-xl overflow-hidden"
        onClick={() => setLocation("/sops")}
      >
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-muted-foreground">SOPs</div>
              <div className="text-3xl font-bold mt-2 tracking-tight">
                {statsLoading ? <Skeleton className="h-9 w-16" /> : stats?.sopCount || 0}
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-gradient-to-br from-green-500 to-green-600 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 shadow-lg">
              <ClipboardList className="h-6 w-6 text-white" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card 
        className="cursor-pointer card-shadow hover:shadow-xl transition-all duration-300 group rounded-xl overflow-hidden"
        onClick={() => setLocation("/admin/categories")}
      >
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-muted-foreground">Kategorien</div>
              <div className="text-3xl font-bold mt-2 tracking-tight">
                {statsLoading ? <Skeleton className="h-9 w-16" /> : stats?.categoryCount || 0}
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 shadow-lg">
              <FolderOpen className="h-6 w-6 text-white" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card 
        className="cursor-pointer card-shadow hover:shadow-xl transition-all duration-300 group rounded-xl overflow-hidden"
        onClick={() => setLocation("/admin/users")}
      >
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-muted-foreground">Benutzer</div>
              <div className="text-3xl font-bold mt-2 tracking-tight">
                {statsLoading ? <Skeleton className="h-9 w-16" /> : stats?.userCount || 1}
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 shadow-lg">
              <Users className="h-6 w-6 text-white" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderRecentArticles = () => (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Kürzlich aktualisiert</CardTitle>
            <CardDescription>Die neuesten Artikel im Wiki</CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setLocation("/wiki")}>
            Alle anzeigen
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {articlesLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-3/4 mb-2" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : recentArticles && recentArticles.length > 0 ? (
          <div className="space-y-2">
            {recentArticles.map((article) => (
              <div
                key={article.id}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors cursor-pointer group"
                onClick={() => setLocation(`/wiki/article/${article.slug}`)}
              >
                <div className="p-2.5 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                  <FileText className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate group-hover:text-primary transition-colors">
                    {article.title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(article.updatedAt), {
                      addSuffix: true,
                      locale: de,
                    })}
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <FileText className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">Noch keine Artikel vorhanden</p>
            {isEditor && (
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-3"
                onClick={() => setLocation("/wiki/new")}
              >
                <Plus className="h-4 w-4 mr-1" />
                Ersten Artikel erstellen
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );

  const renderActivityFeed = () => (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Aktivitäten</CardTitle>
            <CardDescription>Neueste Änderungen im Wiki</CardDescription>
          </div>
          {isAdmin && (
            <Button variant="ghost" size="sm" onClick={() => setLocation("/admin/audit-log")}>
              Audit-Log
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {activityLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-start gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : recentActivity && recentActivity.length > 0 ? (
          <div className="space-y-2">
            {recentActivity.slice(0, 5).map((activity) => (
              <div key={activity.id} className="flex items-start gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors">
                <div className={`p-2 rounded-full mt-0.5 ${
                  activity.action === "create" ? "bg-green-500/10 text-green-600" :
                  activity.action === "update" ? "bg-blue-500/10 text-blue-600" :
                  "bg-red-500/10 text-red-600"
                }`}>
                  {activity.action === "create" && <Plus className="h-3 w-3" />}
                  {activity.action === "update" && <FileText className="h-3 w-3" />}
                  {activity.action === "delete" && <FileText className="h-3 w-3" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm">
                    <span className="font-medium capitalize">
                      {activity.action === "create" ? "Erstellt" : 
                       activity.action === "update" ? "Aktualisiert" : "Gelöscht"}
                    </span>
                    {" · "}
                    <span className="text-muted-foreground">{activity.resourceType}</span>
                  </p>
                  <p className="text-sm font-medium truncate mt-0.5">
                    {activity.resourceTitle || "Unbekannt"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(activity.createdAt), {
                      addSuffix: true,
                      locale: de,
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Bell className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">Keine Aktivitäten vorhanden</p>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const renderFavorites = () => (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-500" />
              Favoriten
            </CardTitle>
            <CardDescription>Deine markierten Artikel</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {favoritesLoading ? (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-3/4 mb-2" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : favorites && favorites.length > 0 ? (
          <div className="space-y-2">
            {favorites.slice(0, 5).map((fav) => (
              <div
                key={fav.id}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors cursor-pointer group"
                onClick={() => setLocation(`/wiki/article/${fav.article?.slug}`)}
              >
                <div className="p-2.5 rounded-lg bg-yellow-500/10 group-hover:bg-yellow-500/20 transition-colors">
                  <Star className="h-4 w-4 text-yellow-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate group-hover:text-primary transition-colors">
                    {fav.article?.title || "Unbekannt"}
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Star className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">Keine Favoriten vorhanden</p>
            <p className="text-xs text-muted-foreground mt-1">
              Markiere Artikel mit dem Stern-Symbol
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const renderOnboardingProgress = () => {
    const pendingCount = assignments?.filter(a => a.status !== "completed").length || 0;
    const completedCount = assignments?.filter(a => a.status === "completed").length || 0;
    const totalCount = assignments?.length || 0;
    const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    return (
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-indigo-500" />
                Onboarding-Fortschritt
              </CardTitle>
              <CardDescription>Dein Einarbeitungsstatus</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setLocation("/onboarding")}>
              Details
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {assignmentsLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-2 w-full" />
            </div>
          ) : totalCount > 0 ? (
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{completedCount} von {totalCount} abgeschlossen</span>
                <span className="font-medium">{progressPercent}%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              {pendingCount > 0 && (
                <p className="text-xs text-muted-foreground">
                  {pendingCount} {pendingCount === 1 ? "Aufgabe" : "Aufgaben"} noch offen
                </p>
              )}
            </div>
          ) : (
            <div className="text-center py-4">
              <CheckCircle className="h-10 w-10 text-green-500 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Keine Aufgaben zugewiesen</p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  // Widget renderer map
  const widgetRenderers: Record<WidgetId, () => React.ReactNode> = {
    welcomeHero: renderWelcomeHero,
    announcements: renderAnnouncements,
    navigation: renderNavigation,
    stats: renderStats,
    recentArticles: renderRecentArticles,
    activityFeed: renderActivityFeed,
    favorites: renderFavorites,
    onboardingProgress: renderOnboardingProgress,
  };

  // Get grid class based on widget size
  const getWidgetGridClass = (widgetId: string): string => {
    const size = getWidgetSize(widgetId);
    switch (size) {
      case "small": return "lg:col-span-1";
      case "large": return "lg:col-span-2";
      default: return "lg:col-span-1";
    }
  };

  // Render widgets in order with size support
  const renderWidgets = () => {
    // Group widgets that should be side by side
    const singleWidgets = ["welcomeHero", "announcements", "navigation", "stats"];
    const resizableWidgets = ["recentArticles", "activityFeed", "favorites", "onboardingProgress"];

    const elements: React.ReactNode[] = [];

    // Render single widgets first (in order)
    widgetOrder.forEach((widgetId) => {
      if (singleWidgets.includes(widgetId) && widgetVisibility[widgetId as WidgetId]) {
        const renderer = widgetRenderers[widgetId as WidgetId];
        if (renderer) {
          const content = renderer();
          if (content) {
            elements.push(
              <div key={widgetId}>
                {content}
              </div>
            );
          }
        }
      }
    });

    // Collect visible resizable widgets in order
    const visibleResizable = widgetOrder.filter(
      (id) => resizableWidgets.includes(id) && widgetVisibility[id as WidgetId]
    );

    if (visibleResizable.length > 0) {
      elements.push(
        <div key="resizable-widgets" className="grid lg:grid-cols-2 gap-6">
          {visibleResizable.map((widgetId) => {
            const renderer = widgetRenderers[widgetId as WidgetId];
            const size = getWidgetSize(widgetId);
            const gridClass = size === "large" ? "lg:col-span-2" : size === "small" ? "lg:col-span-1" : "lg:col-span-1";
            return renderer ? (
              <div key={widgetId} className={`${gridClass} transition-all duration-300`}>
                {renderer()}
              </div>
            ) : null;
          })}
        </div>
      );
    }

    return elements;
  };

  // Pull-to-refresh handler
  const handleRefresh = useCallback(async () => {
    await Promise.all([
      utils.articles.list.invalidate(),
      utils.sops.list.invalidate(),
      utils.announcements.getActive.invalidate(),
      utils.dashboardSettings.get.invalidate(),
      utils.activity.getRecent.invalidate(),
      utils.favorites.list.invalidate(),
      utils.assignments.getMyAssignments.invalidate(),
    ]);
    toast.success("Aktualisiert");
  }, [utils]);

  if (settingsLoading) {
    return (
      <div className="space-y-8 animate-fade-in">
        <Skeleton className="h-48 w-full rounded-2xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
    {/* Mobile: PullToRefresh */}
    <div className="md:hidden">
      <PullToRefresh onRefresh={handleRefresh} className="min-h-screen">
        <div className="space-y-8 animate-fade-in">
          {/* Settings Button */}
          <div className="flex justify-end">
            <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Settings2 className="h-4 w-4" />
                  Dashboard anpassen
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Dashboard anpassen</DialogTitle>
                  <DialogDescription>
                    Wähle aus, welche Widgets auf deinem Dashboard angezeigt werden sollen.
                  </DialogDescription>
                </DialogHeader>
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext items={widgetOrder} strategy={verticalListSortingStrategy}>
                    <div className="space-y-1 py-4">
                      {widgetOrder.map((id) => {
                        const widget = WIDGET_DEFINITIONS[id as WidgetId];
                        if (!widget) return null;
                        return (
                          <SortableWidgetItem
                            key={id}
                            id={id}
                            widget={widget}
                            isVisible={widgetVisibility[id as WidgetId]}
                            currentSize={getWidgetSize(id)}
                            onToggle={(checked) => handleToggleWidget(id, checked)}
                            onSizeChange={(size) => updateSize.mutate({ widgetId: id, size })}
                          />
                        );
                      })}
                    </div>
                  </SortableContext>
                </DndContext>
                <div className="flex justify-between pt-4 border-t">
                  <Button variant="ghost" size="sm" onClick={handleResetSettings}>
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Zurücksetzen
                  </Button>
                  <Button size="sm" onClick={() => setSettingsOpen(false)}>
                    Fertig
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          {renderWidgets()}
        </div>
      </PullToRefresh>
    </div>
    {/* Desktop: Normal content */}
    <div className="hidden md:block space-y-8 animate-fade-in">
      {/* Settings Button */}
      <div className="flex justify-end">
        <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Settings2 className="h-4 w-4" />
              Dashboard anpassen
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Dashboard anpassen</DialogTitle>
              <DialogDescription>
                Wähle aus, welche Widgets auf deinem Dashboard angezeigt werden sollen.
              </DialogDescription>
            </DialogHeader>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={widgetOrder} strategy={verticalListSortingStrategy}>
                <div className="space-y-1 py-4">
                  {widgetOrder.map((id) => {
                    const widget = WIDGET_DEFINITIONS[id as WidgetId];
                    if (!widget) return null;
                    return (
                      <SortableWidgetItem
                        key={id}
                        id={id}
                        widget={widget}
                        isVisible={widgetVisibility[id as WidgetId]}
                        currentSize={getWidgetSize(id)}
                        onToggle={(checked) => handleToggleWidget(id, checked)}
                        onSizeChange={(size) => updateSize.mutate({ widgetId: id, size })}
                      />
                    );
                  })}
                </div>
              </SortableContext>
            </DndContext>
            <div className="flex justify-between pt-4 border-t">
              <Button variant="ghost" size="sm" onClick={handleResetSettings}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Zurücksetzen
              </Button>
              <Button size="sm" onClick={() => setSettingsOpen(false)}>
                Fertig
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Render all visible widgets */}
      {renderWidgets()}
    </div>
    </>
  );
}
