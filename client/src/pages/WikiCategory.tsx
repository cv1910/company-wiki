import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, FileText, FolderOpen, Plus } from "lucide-react";
import { useLocation, useParams } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";

export default function WikiCategory() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const isEditor = user?.role === "editor" || user?.role === "admin";

  const { data: category, isLoading: categoryLoading } = trpc.categories.getBySlug.useQuery(
    { slug: slug || "" },
    { enabled: !!slug }
  );

  const { data: articles, isLoading: articlesLoading } = trpc.articles.getByCategory.useQuery(
    { categoryId: category?.id || 0 },
    { enabled: !!category?.id }
  );

  const { data: allCategories } = trpc.categories.list.useQuery();
  const subcategories = allCategories?.filter((c) => c.parentId === category?.id);

  if (categoryLoading) {
    return (
      <div className="space-y-6 pb-24 md:pb-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-96" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!category) {
    return (
      <div className="text-center py-12">
        <FolderOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-xl font-medium mb-2">Kategorie nicht gefunden</h2>
        <p className="text-muted-foreground mb-4">
          Die angeforderte Kategorie existiert nicht.
        </p>
        <Button variant="outline" onClick={() => setLocation("/wiki")}>
          Zurück zum Wiki
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24 md:pb-6">
      {/* Header */}
      <div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setLocation("/wiki")}
          className="mb-4 -ml-2"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Zurück zum Wiki
        </Button>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-primary/10">
              <FolderOpen className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">{category.name}</h1>
              {category.description && (
                <p className="text-muted-foreground mt-1">{category.description}</p>
              )}
            </div>
          </div>
          {isEditor && (
            <Button onClick={() => setLocation("/wiki/new")} className="card-shadow">
              <Plus className="h-4 w-4 mr-2" />
              Neuer Artikel
            </Button>
          )}
        </div>
      </div>

      {/* Subcategories */}
      {subcategories && subcategories.length > 0 && (
        <div>
          <h2 className="text-lg font-medium mb-4">Unterkategorien</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {subcategories.map((subcat) => (
              <Card
                key={subcat.id}
                className="card-shadow hover:elevated-shadow transition-all cursor-pointer group"
                onClick={() => setLocation(`/wiki/category/${subcat.slug}`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                      <FolderOpen className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate">{subcat.name}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Articles */}
      <div>
        <h2 className="text-lg font-medium mb-4">Artikel in dieser Kategorie</h2>
        {articlesLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
        ) : articles && articles.length > 0 ? (
          <div className="space-y-3">
            {articles.map((article) => (
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
                Noch keine Artikel in dieser Kategorie
              </p>
              {isEditor && (
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
