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
    <div className="space-y-8 pb-[calc(var(--bottom-nav-height,64px)+1rem)] md:pb-6">
      {/* Premium Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-500/10 via-green-500/5 to-transparent border border-green-500/10 p-6 md:p-8">
        
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-green-600 shadow-lg">
                <ClipboardList className="h-5 w-5 text-white" />
              </div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">SOPs</h1>
            </div>
            <p className="text-muted-foreground text-base">
              Standard Operating Procedures
            </p>
          </div>
          {isEditor && (
            <Button 
              onClick={() => setLocation("/sops/new")} 
              className="bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 rounded-xl px-5 h-11 font-semibold shadow-lg text-white"
            >
              <Plus className="h-5 w-5 mr-2" />
              <span className="hidden sm:inline">Neue SOP</span>
              <span className="sm:hidden">Neu</span>
            </Button>
          )}
        </div>
      </div>

      {/* Premium Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          placeholder="SOPs suchen..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-12 h-12 rounded-xl text-base card-shadow focus:shadow-lg transition-shadow"
        />
      </div>

      {/* Categories - Premium Design */}
      <div>
        <h2 className="text-xl font-bold tracking-tight mb-5">Kategorien</h2>
        {categoriesLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))}
          </div>
        ) : sopCategories && sopCategories.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {sopCategories.filter((c) => !c.parentId).map((category, index) => {
              const categorySOPs = sops?.filter((s) => s.categoryId === category.id);
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
                  className="card-shadow hover:shadow-xl transition-all duration-300 cursor-pointer group hover:-translate-y-1 rounded-xl overflow-hidden w-full"
                  onClick={() => setLocation(`/sops/category/${category.slug}`)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-2.5 rounded-xl bg-gradient-to-br ${colorClass} group-hover:scale-105 transition-all duration-300 shadow-lg flex-shrink-0`}>
                        <FolderOpen className="h-5 w-5 text-white" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-sm truncate">{category.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
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

      {/* SOPs List - Premium Design */}
      <div>
        <h2 className="text-xl font-bold tracking-tight mb-5">
          {searchQuery ? `Suchergebnisse für "${searchQuery}"` : "Alle SOPs"}
        </h2>
        {sopsLoading ? (
          <div className="grid md:grid-cols-2 gap-5">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-32 rounded-2xl" />
            ))}
          </div>
        ) : filteredSOPs && filteredSOPs.length > 0 ? (
          <div className="grid md:grid-cols-2 gap-5">
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
                      <h3 className="font-semibold text-base group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">{sop.title}</h3>
                      {sop.description && (
                        <div className="text-sm text-muted-foreground mt-2 line-clamp-2 prose prose-sm dark:prose-invert max-w-none leading-relaxed">
                          <Streamdown>{sop.description.substring(0, 200)}</Streamdown>
                        </div>
                      )}
                      <div className="flex items-center gap-2 mt-3">
                        {sop.scribeUrl && (
                          <span className="text-xs bg-gradient-to-r from-blue-500/20 to-blue-500/10 text-blue-600 px-2.5 py-1 rounded-full font-medium">
                            Scribe
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground/70">
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
