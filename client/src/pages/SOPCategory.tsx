import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, ClipboardList, FolderOpen, Plus } from "lucide-react";
import { useLocation, useParams } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";
import { Streamdown } from "streamdown";

export default function SOPCategory() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const isEditor = user?.role === "editor" || user?.role === "admin";

  const { data: categories, isLoading: categoriesLoading } = trpc.sopCategories.list.useQuery();
  const category = categories?.find((c) => c.slug === slug);

  const { data: sops, isLoading: sopsLoading } = trpc.sops.list.useQuery({ status: "published" });
  const categorySOPs = sops?.filter((s) => s.categoryId === category?.id);

  if (categoriesLoading) {
    return (
      <div className="space-y-6 pb-[calc(var(--bottom-nav-height,64px)+1rem)] md:pb-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-96" />
        <div className="grid md:grid-cols-2 gap-4">
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
        <Button variant="outline" onClick={() => setLocation("/sops")}>
          Zurück zu SOPs
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-[calc(var(--bottom-nav-height,64px)+1rem)] md:pb-6">
      {/* Header */}
      <div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setLocation("/sops")}
          className="mb-4 -ml-2"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Zurück zu SOPs
        </Button>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-green-500/10">
              <FolderOpen className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">{category.name}</h1>
              {category.description && (
                <p className="text-muted-foreground mt-1">{category.description}</p>
              )}
              <p className="text-sm text-muted-foreground mt-1">
                {categorySOPs?.length || 0} SOPs in dieser Kategorie
              </p>
            </div>
          </div>
          {isEditor && (
            <Button onClick={() => setLocation("/sops/new")} className="card-shadow">
              <Plus className="h-4 w-4 mr-2" />
              Neue SOP
            </Button>
          )}
        </div>
      </div>

      {/* SOPs List */}
      {sopsLoading ? (
        <div className="grid md:grid-cols-2 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : categorySOPs && categorySOPs.length > 0 ? (
        <div className="grid md:grid-cols-2 gap-4">
          {categorySOPs.map((sop) => (
            <Card
              key={sop.id}
              className="card-shadow hover:elevated-shadow transition-all cursor-pointer"
              onClick={() => setLocation(`/sops/view/${sop.slug}`)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className="p-2 rounded-lg bg-green-500/10 mt-1">
                    <ClipboardList className="h-5 w-5 text-green-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium truncate">{sop.title}</h3>
                    {sop.description && (
                      <div className="text-sm text-muted-foreground mt-1 line-clamp-2 prose prose-sm dark:prose-invert max-w-none">
                        <Streamdown>{sop.description.substring(0, 200)}</Streamdown>
                      </div>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      {sop.scribeUrl && (
                        <span className="text-xs bg-blue-500/10 text-blue-600 px-2 py-0.5 rounded-full">
                          Scribe
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        Aktualisiert{" "}
                        {formatDistanceToNow(new Date(sop.updatedAt), {
                          addSuffix: true,
                          locale: de,
                        })}
                      </span>
                    </div>
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
              Noch keine SOPs in dieser Kategorie
            </p>
            {isEditor && (
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
  );
}
