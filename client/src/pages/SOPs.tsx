import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { ClipboardList, FolderOpen, Plus, Search } from "lucide-react";
import { Streamdown } from "streamdown";
import { useState } from "react";
import { useLocation } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";

export default function SOPs() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const isEditor = user?.role === "editor" || user?.role === "admin";

  const { data: sopCategories, isLoading: categoriesLoading } = trpc.sopCategories.list.useQuery();
  const { data: sops, isLoading: sopsLoading } = trpc.sops.list.useQuery({ status: "published" });

  const filteredSOPs = sops?.filter(
    (sop) =>
      sop.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sop.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-3">
        {/* Mobile: Kompaktes Layout */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">SOPs</h1>
          {isEditor && (
            <Button onClick={() => setLocation("/sops/new")} size="sm" className="card-shadow sm:hidden">
              <Plus className="h-4 w-4 mr-1" />
              Neu
            </Button>
          )}
          {isEditor && (
            <Button onClick={() => setLocation("/sops/new")} className="card-shadow hidden sm:flex">
              <Plus className="h-4 w-4 mr-2" />
              Neue SOP
            </Button>
          )}
        </div>
        <p className="text-sm sm:text-base text-muted-foreground">
          Standard Operating Procedures
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="SOPs suchen..."
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
        ) : sopCategories && sopCategories.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {sopCategories.filter((c) => !c.parentId).map((category) => {
              const categorySOPs = sops?.filter((s) => s.categoryId === category.id);
              return (
                <Card
                  key={category.id}
                  className="card-shadow hover:elevated-shadow transition-all cursor-pointer group"
                  onClick={() => setLocation(`/sops/category/${category.slug}`)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-green-500/10 group-hover:bg-green-500/20 transition-colors">
                        <FolderOpen className="h-5 w-5 text-green-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium truncate">{category.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {categorySOPs?.length || 0} SOPs
                        </p>
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
            </CardContent>
          </Card>
        )}
      </div>

      {/* SOPs List */}
      <div>
        <h2 className="text-lg font-medium mb-4">
          {searchQuery ? `Suchergebnisse für "${searchQuery}"` : "Alle SOPs"}
        </h2>
        {sopsLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
        ) : filteredSOPs && filteredSOPs.length > 0 ? (
          <div className="grid md:grid-cols-2 gap-4">
            {filteredSOPs.map((sop) => (
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
                {searchQuery ? "Keine SOPs gefunden" : "Noch keine SOPs vorhanden"}
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
    </div>
  );
}
