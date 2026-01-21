import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { FileText, FolderOpen, Plus, Search } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";

export default function Wiki() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const isEditor = user?.role === "editor" || user?.role === "admin";

  const { data: categories, isLoading: categoriesLoading } = trpc.categories.list.useQuery();
  const { data: articles, isLoading: articlesLoading } = trpc.articles.list.useQuery({ status: "published" });

  const filteredArticles = articles?.filter(
    (article) =>
      article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.excerpt?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8">
      {/* Premium Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent border border-blue-500/10 p-6 md:p-8">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg">
                <FileText className="h-5 w-5 text-white" />
              </div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Wiki</h1>
            </div>
            <p className="text-muted-foreground text-base">
              Durchsuchen Sie die Wissensdatenbank
            </p>
          </div>
          {isEditor && (
            <Button 
              onClick={() => setLocation("/wiki/new")} 
              className="btn-gradient rounded-xl px-5 h-11 font-semibold shadow-lg"
            >
              <Plus className="h-5 w-5 mr-2" />
              <span className="hidden sm:inline">Neuer Artikel</span>
              <span className="sm:hidden">Neu</span>
            </Button>
          )}
        </div>
      </div>

      {/* Premium Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          placeholder="Artikel suchen..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-12 h-12 rounded-xl text-base card-shadow focus:shadow-lg transition-shadow"
        />
      </div>

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
    </div>
  );
}
