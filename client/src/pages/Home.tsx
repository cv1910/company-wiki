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
  FolderOpen
} from "lucide-react";
import { useLocation } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";

export default function Home() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const isEditor = user?.role === "editor" || user?.role === "admin";
  const isAdmin = user?.role === "admin";

  const { data: stats, isLoading: statsLoading } = trpc.dashboard.stats.useQuery();
  const { data: recentArticles, isLoading: articlesLoading } = trpc.dashboard.recentArticles.useQuery();
  const { data: recentActivity, isLoading: activityLoading } = trpc.dashboard.recentActivity.useQuery();
  const { data: announcements, isLoading: announcementsLoading } = trpc.announcements.getActive.useQuery();

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
      icon: Book, 
      label: "Wiki", 
      description: "Wissensdatenbank durchsuchen",
      path: "/wiki", 
      color: "from-blue-500 to-blue-600",
      bgColor: "bg-blue-500/10",
      textColor: "text-blue-600 dark:text-blue-400"
    },
    { 
      icon: ClipboardList, 
      label: "SOPs", 
      description: "Standard Operating Procedures",
      path: "/sops", 
      color: "from-green-500 to-green-600",
      bgColor: "bg-green-500/10",
      textColor: "text-green-600 dark:text-green-400"
    },
    { 
      icon: Search, 
      label: "Suche", 
      description: "Inhalte finden",
      path: "/search", 
      color: "from-purple-500 to-purple-600",
      bgColor: "bg-purple-500/10",
      textColor: "text-purple-600 dark:text-purple-400"
    },
    { 
      icon: MessageCircle, 
      label: "AI-Assistent", 
      description: "Fragen stellen",
      path: "/chat", 
      color: "from-pink-500 to-pink-600",
      bgColor: "bg-pink-500/10",
      textColor: "text-pink-600 dark:text-pink-400"
    },
    { 
      icon: Calendar, 
      label: "Urlaub", 
      description: "Abwesenheiten verwalten",
      path: "/leave", 
      color: "from-orange-500 to-orange-600",
      bgColor: "bg-orange-500/10",
      textColor: "text-orange-600 dark:text-orange-400"
    },
    { 
      icon: Bell, 
      label: "Benachrichtigungen", 
      description: "Neuigkeiten & Updates",
      path: "/notifications", 
      color: "from-cyan-500 to-cyan-600",
      bgColor: "bg-cyan-500/10",
      textColor: "text-cyan-600 dark:text-cyan-400"
    },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Hero Welcome Section */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/10 p-8">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="relative">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium text-primary">Company Wiki</span>
              </div>
              <h1 className="text-3xl font-bold tracking-tight">
                Willkommen zurück, {user?.name?.split(" ")[0] || "Benutzer"}!
              </h1>
              <p className="text-muted-foreground mt-2 max-w-lg">
                Hier findest du alle wichtigen Informationen, Prozesse und Anleitungen für deinen Arbeitsalltag.
              </p>
            </div>
            {isEditor && (
              <Button 
                onClick={() => setLocation("/wiki/new")} 
                size="lg"
                className="shadow-lg hover:shadow-xl transition-all"
              >
                <Plus className="h-4 w-4 mr-2" />
                Neuer Artikel
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Announcements Section */}
      {!announcementsLoading && announcements && announcements.length > 0 && (
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
      )}

      {/* Navigation Grid */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Navigation</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {navigationItems.map((item) => (
            <Card
              key={item.path}
              className="group cursor-pointer border-0 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 overflow-hidden"
              onClick={() => setLocation(item.path)}
            >
              <CardContent className="p-4 text-center">
                <div className={`mx-auto w-12 h-12 rounded-xl ${item.bgColor} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300`}>
                  <item.icon className={`h-6 w-6 ${item.textColor}`} />
                </div>
                <h3 className="font-medium text-sm">{item.label}</h3>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{item.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card 
          className="cursor-pointer hover:shadow-md transition-all group"
          onClick={() => setLocation("/wiki")}
        >
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Artikel</p>
                <p className="text-2xl font-bold mt-1">
                  {statsLoading ? <Skeleton className="h-8 w-16" /> : stats?.articleCount || 0}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-blue-500/10 group-hover:scale-110 transition-transform">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-md transition-all group"
          onClick={() => setLocation("/sops")}
        >
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">SOPs</p>
                <p className="text-2xl font-bold mt-1">
                  {statsLoading ? <Skeleton className="h-8 w-16" /> : stats?.sopCount || 0}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-green-500/10 group-hover:scale-110 transition-transform">
                <ClipboardList className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-md transition-all group"
          onClick={() => setLocation("/admin/categories")}
        >
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Kategorien</p>
                <p className="text-2xl font-bold mt-1">
                  {statsLoading ? <Skeleton className="h-8 w-16" /> : stats?.categoryCount || 0}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-purple-500/10 group-hover:scale-110 transition-transform">
                <FolderOpen className="h-5 w-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-md transition-all group"
          onClick={() => setLocation("/admin/users")}
        >
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Benutzer</p>
                <p className="text-2xl font-bold mt-1">
                  {statsLoading ? <Skeleton className="h-8 w-16" /> : stats?.userCount || 1}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-orange-500/10 group-hover:scale-110 transition-transform">
                <Users className="h-5 w-5 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Articles & Activity */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Articles */}
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

        {/* Recent Activity */}
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
      </div>
    </div>
  );
}
