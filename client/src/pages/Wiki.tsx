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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Wiki</h1>
          <p className="text-muted-foreground mt-1">
            Durchsuchen Sie die Wissensdatenbank
          </p>
        </div>
        {isEditor && (
          <Button onClick={() => setLocation("/wiki/new")} className="card-shadow">
            <Plus className="h-4 w-4 mr-2" />
            Neuer Artikel
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Artikel suchen..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Categories */}
      <div>
        <h2 className="text-lg font-medium mb-4">Kategorien</h2>
        {categoriesLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
        ) : categories && categories.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {categories.filter((c) => !c.parentId).map((category) => (
              <Card
                key={category.id}
                className="card-shadow hover:elevated-shadow transition-all cursor-pointer group"
                onClick={() => setLocation(`/wiki/category/${category.slug}`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                      <FolderOpen className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate">{category.name}</p>
                      {category.description && (
                        <p className="text-xs text-muted-foreground truncate">
                          {category.description}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
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

      {/* Articles */}
      <div>
        <h2 className="text-lg font-medium mb-4">
          {searchQuery ? `Suchergebnisse für "${searchQuery}"` : "Alle Artikel"}
        </h2>
        {articlesLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
        ) : filteredArticles && filteredArticles.length > 0 ? (
          <div className="space-y-3">
            {filteredArticles.map((article) => (
              <Card
                key={article.id}
                className="card-shadow hover:elevated-shadow transition-all cursor-pointer"
                onClick={() => setLocation(`/wiki/article/${article.slug}`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="p-2 rounded-lg bg-primary/10 mt-1">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium truncate">{article.title}</h3>
                        {article.isPinned && (
                          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                            Angepinnt
                          </span>
                        )}
                      </div>
                      {article.excerpt && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {article.excerpt}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-2">
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
