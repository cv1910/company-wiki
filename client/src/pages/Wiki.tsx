import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { FileText, FolderOpen, Plus, Search, X, ClipboardList, Book, MessageCircle } from "lucide-react";
import { useState, useCallback } from "react";
import { useLocation } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";
import { PullToRefresh } from "@/components/PullToRefresh";
import { toast } from "@/lib/hapticToast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Wiki() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("wiki");
  const isEditor = user?.role === "editor" || user?.role === "admin";
  const utils = trpc.useUtils();

  const { data: categories, isLoading: categoriesLoading } = trpc.categories.list.useQuery();
  const { data: articles, isLoading: articlesLoading } = trpc.articles.list.useQuery({ status: "published" });
  
  // SOP Data
  const { data: sopCategories, isLoading: sopCategoriesLoading } = trpc.sopCategories.list.useQuery();
  const { data: sops, isLoading: sopsLoading } = trpc.sops.list.useQuery({ status: "published" });

  // Pull-to-refresh handler
  const handleRefresh = useCallback(async () => {
    await Promise.all([
      utils.categories.list.invalidate(),
      utils.articles.list.invalidate(),
      utils.sopCategories.list.invalidate(),
      utils.sops.list.invalidate(),
    ]);
    toast.success("Aktualisiert");
  }, [utils]);

  const filteredArticles = articles?.filter(
    (article) =>
      article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.excerpt?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredSOPs = sops?.filter(
    (sop) =>
      sop.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sop.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
    {/* Mobile: PullToRefresh */}
    <div className="md:hidden overflow-hidden w-full max-w-full">
    <PullToRefresh onRefresh={handleRefresh} className="min-h-[100dvh] bg-background">
      <div className="space-y-8 pb-24 min-h-[100dvh] bg-background w-full max-w-full">
      {/* Premium Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent border border-blue-500/10 p-6 md:p-8">
        
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg">
                <Book className="h-5 w-5 text-white" />
              </div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Wissensdatenbank</h1>
            </div>
            <p className="text-muted-foreground text-base">
              Wiki-Artikel und Prozessbeschreibungen
            </p>
          </div>
          {isEditor && (
            <Button 
              onClick={() => setLocation(activeTab === "wiki" ? "/wiki/new" : "/sops/new")} 
              className="btn-gradient rounded-xl px-5 h-11 font-semibold shadow-lg"
            >
              <Plus className="h-5 w-5 mr-2" />
              <span className="hidden sm:inline">{activeTab === "wiki" ? "Neuer Artikel" : "Neue SOP"}</span>
              <span className="sm:hidden">Neu</span>
            </Button>
          )}
        </div>
      </div>

      {/* Tabs for Wiki/SOPs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 h-12 rounded-xl bg-muted/50">
          <TabsTrigger value="wiki" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm gap-2">
            <FileText className="h-4 w-4" />
            Wiki
          </TabsTrigger>
          <TabsTrigger value="sops" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm gap-2">
            <ClipboardList className="h-4 w-4" />
            SOPs
          </TabsTrigger>
        </TabsList>

      {/* Premium Search - durchsucht beide Tabs */}
      <div className="relative mt-4">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          placeholder="Wiki & SOPs durchsuchen..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-12 pr-12 h-12 rounded-xl text-base card-shadow focus:shadow-lg transition-shadow"
        />
        {searchQuery && (
          <>
            <span className="absolute right-12 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
              {(filteredArticles?.length || 0) + (filteredSOPs?.length || 0)} Treffer
            </span>
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-muted transition-colors"
              aria-label="Suche löschen"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </>
        )}
      </div>

      <TabsContent value="wiki" className="mt-6 space-y-6">
      {/* Categories - Premium Design */}
      <div>
        <h2 className="text-xl font-bold tracking-tight mb-5">Kategorien</h2>
        {categoriesLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-28 rounded-2xl" />
            ))}
          </div>
        ) : categories && categories.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {categories.filter((c) => !c.parentId).map((category, index) => {
              const colors = [
                "from-blue-500 to-blue-600",
                "from-green-500 to-green-600",
                "from-purple-500 to-purple-600",
                "from-orange-500 to-orange-600",
                "from-pink-500 to-pink-600",
                "from-teal-500 to-teal-600",
              ];
              const colorClass = colors[index % colors.length];
              return (
                <Card
                  key={category.id}
                  className="card-shadow hover:shadow-xl transition-all duration-300 cursor-pointer group hover:-translate-y-2 rounded-xl overflow-hidden"
                  onClick={() => setLocation(`/wiki/category/${category.slug}`)}
                >
                  <CardContent className="p-5">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-xl bg-gradient-to-br ${colorClass} group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg`}>
                        <FolderOpen className="h-6 w-6 text-white" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold truncate text-base">{category.name}</p>
                        {category.description && (
                          <p className="text-sm text-muted-foreground truncate mt-0.5">
                            {category.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="card-shadow">
            <CardContent className="p-8 text-center">
              <FolderOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Noch keine Kategorien vorhanden</p>
              {isEditor && (
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => setLocation("/admin/categories")}
                >
                  Kategorien verwalten
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Articles - Premium Design */}
      <div>
        <h2 className="text-xl font-bold tracking-tight mb-5">
          {searchQuery ? `Suchergebnisse für "${searchQuery}"` : "Alle Artikel"}
        </h2>
        {articlesLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-28 rounded-2xl" />
            ))}
          </div>
        ) : filteredArticles && filteredArticles.length > 0 ? (
          <div className="space-y-4">
            {filteredArticles.map((article) => (
              <Card
                key={article.id}
                className="card-shadow hover:shadow-xl transition-all duration-300 cursor-pointer group hover:-translate-y-1 rounded-xl overflow-hidden"
                onClick={() => setLocation(`/wiki/article/${article.slug}`)}
              >
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                      <FileText className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-base group-hover:text-primary transition-colors">{article.title}</h3>
                        {article.isPinned && (
                          <span className="text-xs bg-gradient-to-r from-primary/20 to-primary/10 text-primary px-2.5 py-1 rounded-full font-medium">
                            Angepinnt
                          </span>
                        )}
                      </div>
                      {article.excerpt && (
                        <p className="text-sm text-muted-foreground mt-2 line-clamp-2 leading-relaxed">
                          {article.excerpt}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground/70 mt-3">
                        Aktualisiert{" "}
                        {formatDistanceToNow(new Date(article.updatedAt), {
                          addSuffix: true,
                          locale: de,
                        })}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="card-shadow">
            <CardContent className="p-8 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {searchQuery
                  ? "Keine Artikel gefunden"
                  : "Noch keine Artikel vorhanden"}
              </p>
              {isEditor && !searchQuery && (
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => setLocation("/wiki/new")}
                >
                  Ersten Artikel erstellen
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
      </TabsContent>

      <TabsContent value="sops" className="mt-6 space-y-6">
        {/* SOP Categories */}
        <div>
          <h2 className="text-xl font-bold tracking-tight mb-5">Kategorien</h2>
          {sopCategoriesLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-28 rounded-2xl" />
              ))}
            </div>
          ) : sopCategories && sopCategories.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
              {sopCategories.filter((c) => !c.parentId).map((category, index) => {
                const colors = [
                  "from-green-500 to-green-600",
                  "from-teal-500 to-teal-600",
                  "from-emerald-500 to-emerald-600",
                  "from-cyan-500 to-cyan-600",
                ];
                const colorClass = colors[index % colors.length];
                return (
                  <Card
                    key={category.id}
                    className="card-shadow hover:shadow-xl transition-all duration-300 cursor-pointer group hover:-translate-y-2 rounded-xl overflow-hidden"
                    onClick={() => setLocation(`/sops/category/${category.slug}`)}
                  >
                    <CardContent className="p-5">
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-xl bg-gradient-to-br ${colorClass} group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg`}>
                          <ClipboardList className="h-6 w-6 text-white" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold truncate text-base">{category.name}</p>
                          {category.description && (
                            <p className="text-sm text-muted-foreground truncate mt-0.5">
                              {category.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card className="card-shadow">
              <CardContent className="p-8 text-center">
                <FolderOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Noch keine SOP-Kategorien vorhanden</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* SOPs List */}
        <div>
          <h2 className="text-xl font-bold tracking-tight mb-5">
            {searchQuery ? `Suchergebnisse für "${searchQuery}"` : "Alle SOPs"}
          </h2>
          {sopsLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-28 rounded-2xl" />
              ))}
            </div>
          ) : filteredSOPs && filteredSOPs.length > 0 ? (
            <div className="space-y-4">
              {filteredSOPs.map((sop) => (
                <Card
                  key={sop.id}
                  className="card-shadow hover:shadow-xl transition-all duration-300 cursor-pointer group hover:-translate-y-1 rounded-xl overflow-hidden"
                  onClick={() => setLocation(`/sops/view/${sop.slug}`)}
                >
                  <CardContent className="p-5">
                    <div className="flex items-start gap-4">
                      <div className="p-3 rounded-xl bg-gradient-to-br from-green-500 to-green-600 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                        <ClipboardList className="h-5 w-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-base group-hover:text-primary transition-colors">{sop.title}</h3>
                        {sop.description && (
                          <p className="text-sm text-muted-foreground mt-2 line-clamp-2 leading-relaxed">
                            {sop.description}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground/70 mt-3">
                          Aktualisiert{" "}
                          {formatDistanceToNow(new Date(sop.updatedAt), {
                            addSuffix: true,
                            locale: de,
                          })}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="card-shadow">
              <CardContent className="p-8 text-center">
                <ClipboardList className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  {searchQuery
                    ? "Keine SOPs gefunden"
                    : "Noch keine SOPs vorhanden"}
                </p>
                {isEditor && !searchQuery && (
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => setLocation("/sops/new")}
                  >
                    Erste SOP erstellen
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </TabsContent>
      </Tabs>
      </div>
    </PullToRefresh>
    </div>
    {/* Desktop: Normal content */}
    <div className="hidden md:block space-y-8">
      {/* Premium Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent border border-blue-500/10 p-6 md:p-8">
        
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg">
                <Book className="h-5 w-5 text-white" />
              </div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Wissensdatenbank</h1>
            </div>
            <p className="text-muted-foreground text-base">
              Wiki-Artikel und Prozessbeschreibungen
            </p>
          </div>
          {isEditor && (
            <Button 
              onClick={() => setLocation(activeTab === "wiki" ? "/wiki/new" : "/sops/new")} 
              className="gap-2 shadow-sm"
            >
              <Plus className="h-4 w-4" />
              <span>{activeTab === "wiki" ? "Neuer Artikel" : "Neue SOP"}</span>
            </Button>
          )}
        </div>
      </div>

      {/* Tabs for Wiki/SOPs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 h-11">
          <TabsTrigger value="wiki" className="gap-2">
            <FileText className="h-4 w-4" />
            Wiki
          </TabsTrigger>
          <TabsTrigger value="sops" className="gap-2">
            <ClipboardList className="h-4 w-4" />
            SOPs
          </TabsTrigger>
        </TabsList>

        {/* Search */}
        <div className="relative mt-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={activeTab === "wiki" ? "Artikel suchen..." : "SOPs suchen..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-10"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
              onClick={() => setSearchQuery("")}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        <TabsContent value="wiki" className="mt-4 space-y-6">
          {articlesLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader>
                    <div className="h-4 bg-muted rounded w-3/4" />
                  </CardHeader>
                  <CardContent>
                    <div className="h-3 bg-muted rounded w-full mb-2" />
                    <div className="h-3 bg-muted rounded w-2/3" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (filteredArticles?.length ?? 0) === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground text-center">
                  {searchQuery ? "Keine Artikel gefunden" : "Noch keine Artikel vorhanden"}
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Alle Artikel</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {filteredArticles?.map((article) => (
                    <div
                      key={article.id}
                      className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => setLocation(`/wiki/article/${article.slug}`)}
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{article.title}</p>
                          {article.excerpt && (
                            <p className="text-sm text-muted-foreground line-clamp-1">
                              {article.excerpt}
                            </p>
                          )}
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(article.updatedAt), {
                          addSuffix: true,
                          locale: de,
                        })}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="sops" className="mt-4 space-y-6">
          {sopsLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader>
                    <div className="h-4 bg-muted rounded w-3/4" />
                  </CardHeader>
                  <CardContent>
                    <div className="h-3 bg-muted rounded w-full mb-2" />
                    <div className="h-3 bg-muted rounded w-2/3" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (filteredSOPs?.length ?? 0) === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <ClipboardList className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground text-center">
                  {searchQuery ? "Keine SOPs gefunden" : "Noch keine SOPs vorhanden"}
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Alle SOPs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {filteredSOPs?.map((sop) => (
                    <div
                      key={sop.id}
                      className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => setLocation(`/sops/view/${sop.slug}`)}
                    >
                      <div className="flex items-center gap-3">
                        <ClipboardList className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{sop.title}</p>
                          {sop.description && (
                            <p className="text-sm text-muted-foreground line-clamp-1">
                              {sop.description}
                            </p>
                          )}
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(sop.updatedAt), {
                          addSuffix: true,
                          locale: de,
                        })}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
    </>
  );
}
