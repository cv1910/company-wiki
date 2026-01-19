import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { 
  BarChart3, 
  Eye, 
  Users, 
  Search, 
  TrendingUp,
  FileText,
  ClipboardList,
  ExternalLink,
  Calendar
} from "lucide-react";

export default function Analytics() {
  const [timeRange, setTimeRange] = useState<string>("30");
  
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - parseInt(timeRange));
  
  const { data: summary, isLoading: summaryLoading } = trpc.analytics.summary.useQuery({
    startDate: startDate.toISOString(),
  });
  
  const { data: popularArticles, isLoading: articlesLoading } = trpc.analytics.popularArticles.useQuery({
    limit: 10,
    startDate: startDate.toISOString(),
  });
  
  const { data: popularSOPs, isLoading: sopsLoading } = trpc.analytics.popularSOPs.useQuery({
    limit: 10,
    startDate: startDate.toISOString(),
  });
  
  const { data: topSearches, isLoading: searchesLoading } = trpc.analytics.topSearches.useQuery({
    limit: 15,
    startDate: startDate.toISOString(),
  });
  
  const { data: userActivity, isLoading: activityLoading } = trpc.analytics.userActivity.useQuery({
    limit: 15,
    startDate: startDate.toISOString(),
  });
  
  const { data: viewsOverTime } = trpc.analytics.viewsOverTime.useQuery({
    days: parseInt(timeRange),
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Analytics Dashboard</h1>
          <p className="text-muted-foreground">
            Übersicht über die Nutzung des Company Wikis
          </p>
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-[180px]">
            <Calendar className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Letzte 7 Tage</SelectItem>
            <SelectItem value="30">Letzte 30 Tage</SelectItem>
            <SelectItem value="90">Letzte 90 Tage</SelectItem>
            <SelectItem value="365">Letztes Jahr</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Seitenaufrufe</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {summaryLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl font-bold">{summary?.totalPageViews?.toLocaleString() || 0}</div>
            )}
            <p className="text-xs text-muted-foreground">
              Gesamte Seitenaufrufe im Zeitraum
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aktive Benutzer</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {summaryLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl font-bold">{summary?.uniqueVisitors?.toLocaleString() || 0}</div>
            )}
            <p className="text-xs text-muted-foreground">
              Eindeutige Benutzer im Zeitraum
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Suchanfragen</CardTitle>
            <Search className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {summaryLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl font-bold">{summary?.totalSearches?.toLocaleString() || 0}</div>
            )}
            <p className="text-xs text-muted-foreground">
              Durchgeführte Suchen im Zeitraum
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for detailed analytics */}
      <Tabs defaultValue="content" className="space-y-4">
        <TabsList>
          <TabsTrigger value="content" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Beliebte Inhalte
          </TabsTrigger>
          <TabsTrigger value="searches" className="gap-2">
            <Search className="h-4 w-4" />
            Suchanfragen
          </TabsTrigger>
          <TabsTrigger value="users" className="gap-2">
            <Users className="h-4 w-4" />
            Benutzeraktivität
          </TabsTrigger>
        </TabsList>

        {/* Popular Content Tab */}
        <TabsContent value="content" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Popular Articles */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Beliebte Artikel
                </CardTitle>
                <CardDescription>
                  Die meistgelesenen Wiki-Artikel
                </CardDescription>
              </CardHeader>
              <CardContent>
                {articlesLoading ? (
                  <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : popularArticles && popularArticles.length > 0 ? (
                  <div className="space-y-3">
                    {popularArticles.map((article, index) => (
                      <div
                        key={article.resourceId}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-lg font-bold text-muted-foreground w-6">
                            {index + 1}
                          </span>
                          <div>
                            <Link
                              href={`/wiki/article/${article.resourceSlug}`}
                              className="font-medium hover:underline flex items-center gap-1"
                            >
                              {article.resourceTitle || "Unbekannter Artikel"}
                              <ExternalLink className="h-3 w-3" />
                            </Link>
                            <p className="text-xs text-muted-foreground">
                              {article.uniqueViewers} Benutzer
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="font-bold">{article.viewCount}</span>
                          <p className="text-xs text-muted-foreground">Aufrufe</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    Noch keine Daten vorhanden
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Popular SOPs */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ClipboardList className="h-5 w-5" />
                  Beliebte SOPs
                </CardTitle>
                <CardDescription>
                  Die meistgelesenen Arbeitsanweisungen
                </CardDescription>
              </CardHeader>
              <CardContent>
                {sopsLoading ? (
                  <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : popularSOPs && popularSOPs.length > 0 ? (
                  <div className="space-y-3">
                    {popularSOPs.map((sop, index) => (
                      <div
                        key={sop.resourceId}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-lg font-bold text-muted-foreground w-6">
                            {index + 1}
                          </span>
                          <div>
                            <Link
                              href={`/sops/${sop.resourceSlug}`}
                              className="font-medium hover:underline flex items-center gap-1"
                            >
                              {sop.resourceTitle || "Unbekannte SOP"}
                              <ExternalLink className="h-3 w-3" />
                            </Link>
                            <p className="text-xs text-muted-foreground">
                              {sop.uniqueViewers} Benutzer
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="font-bold">{sop.viewCount}</span>
                          <p className="text-xs text-muted-foreground">Aufrufe</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    Noch keine Daten vorhanden
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Search Queries Tab */}
        <TabsContent value="searches">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Top Suchanfragen
              </CardTitle>
              <CardDescription>
                Die häufigsten Suchbegriffe und deren Erfolgsrate
              </CardDescription>
            </CardHeader>
            <CardContent>
              {searchesLoading ? (
                <div className="space-y-3">
                  {[...Array(10)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : topSearches && topSearches.length > 0 ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-4 gap-4 text-sm font-medium text-muted-foreground pb-2 border-b">
                    <span>Suchbegriff</span>
                    <span className="text-right">Anzahl</span>
                    <span className="text-right">Ø Ergebnisse</span>
                    <span className="text-right">Klickrate</span>
                  </div>
                  {topSearches.map((search, index) => (
                    <div
                      key={search.query}
                      className="grid grid-cols-4 gap-4 p-3 rounded-lg hover:bg-muted/50"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground w-5">{index + 1}.</span>
                        <span className="font-medium truncate">{search.query}</span>
                      </div>
                      <span className="text-right font-bold">{search.searchCount}</span>
                      <span className="text-right">{Math.round(search.avgResults || 0)}</span>
                      <span className="text-right">
                        <span className={`px-2 py-0.5 rounded text-xs ${
                          (search.clickRate || 0) >= 50 
                            ? "bg-green-500/20 text-green-600" 
                            : (search.clickRate || 0) >= 25 
                              ? "bg-yellow-500/20 text-yellow-600"
                              : "bg-red-500/20 text-red-600"
                        }`}>
                          {Math.round(search.clickRate || 0)}%
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  Noch keine Suchanfragen aufgezeichnet
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* User Activity Tab */}
        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Benutzeraktivität
              </CardTitle>
              <CardDescription>
                Die aktivsten Benutzer im ausgewählten Zeitraum
              </CardDescription>
            </CardHeader>
            <CardContent>
              {activityLoading ? (
                <div className="space-y-3">
                  {[...Array(10)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : userActivity && userActivity.length > 0 ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-3 gap-4 text-sm font-medium text-muted-foreground pb-2 border-b">
                    <span>Benutzer</span>
                    <span className="text-right">Seitenaufrufe</span>
                    <span className="text-right">Zuletzt aktiv</span>
                  </div>
                  {userActivity.map((user, index) => (
                    <div
                      key={user.userId}
                      className="grid grid-cols-3 gap-4 p-3 rounded-lg hover:bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-muted-foreground w-5">{index + 1}.</span>
                        <div>
                          <p className="font-medium">{user.userName || "Unbekannt"}</p>
                          <p className="text-xs text-muted-foreground">{user.userEmail}</p>
                        </div>
                      </div>
                      <span className="text-right font-bold self-center">{user.pageViews}</span>
                      <span className="text-right text-muted-foreground self-center">
                        {user.lastActive 
                          ? new Date(user.lastActive).toLocaleDateString("de-DE", {
                              day: "2-digit",
                              month: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "-"
                        }
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  Noch keine Aktivitätsdaten vorhanden
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
