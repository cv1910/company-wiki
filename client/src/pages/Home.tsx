import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { Book, ClipboardList, FileText, MessageCircle, Plus, TrendingUp, Users } from "lucide-react";
import { useLocation } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";

export default function Home() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const isEditor = user?.role === "editor" || user?.role === "admin";

  const { data: stats, isLoading: statsLoading } = trpc.dashboard.stats.useQuery();
  const { data: recentArticles, isLoading: articlesLoading } = trpc.dashboard.recentArticles.useQuery();
  const { data: recentActivity, isLoading: activityLoading } = trpc.dashboard.recentActivity.useQuery();

  const quickActions = [
    { icon: Book, label: "Wiki durchsuchen", path: "/wiki", color: "bg-blue-500/10 text-blue-600" },
    { icon: ClipboardList, label: "SOPs ansehen", path: "/sops", color: "bg-green-500/10 text-green-600" },
    { icon: MessageCircle, label: "AI-Assistent", path: "/chat", color: "bg-purple-500/10 text-purple-600" },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Willkommen zurück, {user?.name?.split(" ")[0] || "Benutzer"}
          </h1>
          <p className="text-muted-foreground mt-1">
            Hier ist eine Übersicht über das Company Wiki
          </p>
        </div>
        {isEditor && (
          <Button onClick={() => setLocation("/wiki/new")} className="card-shadow">
            <Plus className="h-4 w-4 mr-2" />
            Neuer Artikel
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="card-shadow">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-blue-500/10">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-semibold">
                  {statsLoading ? <Skeleton className="h-8 w-12" /> : stats?.articleCount || 0}
                </div>
                <div className="text-sm text-muted-foreground">Artikel</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-shadow">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-green-500/10">
                <ClipboardList className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-semibold">
                  {statsLoading ? <Skeleton className="h-8 w-12" /> : stats?.sopCount || 0}
                </div>
                <div className="text-sm text-muted-foreground">SOPs</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-shadow">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-purple-500/10">
                <Book className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <div className="text-2xl font-semibold">
                  {statsLoading ? <Skeleton className="h-8 w-12" /> : stats?.categoryCount || 0}
                </div>
                <div className="text-sm text-muted-foreground">Kategorien</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-shadow">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-orange-500/10">
                <TrendingUp className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <div className="text-2xl font-semibold">
                  {statsLoading ? <Skeleton className="h-8 w-12" /> : stats?.sopCategoryCount || 0}
                </div>
                <div className="text-sm text-muted-foreground">SOP-Kategorien</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-medium mb-4">Schnellzugriff</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {quickActions.map((action) => (
            <Card
              key={action.path}
              className="card-shadow hover:elevated-shadow transition-all cursor-pointer group"
              onClick={() => setLocation(action.path)}
            >
              <CardContent className="p-6 flex items-center gap-4">
                <div className={`p-3 rounded-xl ${action.color} group-hover:scale-110 transition-transform`}>
                  <action.icon className="h-5 w-5" />
                </div>
                <span className="font-medium">{action.label}</span>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Recent Articles & Activity */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Articles */}
        <Card className="card-shadow">
          <CardHeader>
            <CardTitle className="text-lg">Kürzlich aktualisiert</CardTitle>
            <CardDescription>Die neuesten Artikel im Wiki</CardDescription>
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
              <div className="space-y-3">
                {recentArticles.map((article) => (
                  <div
                    key={article.id}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => setLocation(`/wiki/article/${article.slug}`)}
                  >
                    <div className="p-2 rounded-lg bg-primary/10">
                      <FileText className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{article.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(article.updatedAt), {
                          addSuffix: true,
                          locale: de,
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                Noch keine Artikel vorhanden
              </p>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="card-shadow">
          <CardHeader>
            <CardTitle className="text-lg">Aktivitäten</CardTitle>
            <CardDescription>Neueste Änderungen im Wiki</CardDescription>
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
              <div className="space-y-3">
                {recentActivity.slice(0, 5).map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3 p-2">
                    <div className="p-1.5 rounded-full bg-muted mt-0.5">
                      {activity.action === "create" && <Plus className="h-3 w-3" />}
                      {activity.action === "update" && <FileText className="h-3 w-3" />}
                      {activity.action === "delete" && <FileText className="h-3 w-3" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">
                        <span className="font-medium capitalize">{activity.action}</span>
                        {" "}
                        <span className="text-muted-foreground">{activity.resourceType}:</span>
                        {" "}
                        <span className="truncate">{activity.resourceTitle || "Unbekannt"}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">
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
              <p className="text-muted-foreground text-center py-8">
                Keine Aktivitäten vorhanden
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
