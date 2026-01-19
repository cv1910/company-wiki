import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { ClipboardList, FileText, Search as SearchIcon, Sparkles, Zap } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";

export default function Search() {
  const [, setLocation] = useLocation();
  const [query, setQuery] = useState("");
  const [searchType, setSearchType] = useState<"all" | "articles" | "sops">("all");
  const [useSemanticSearch, setUseSemanticSearch] = useState(true);

  // Traditional search
  const { data: textResults, isLoading: textLoading } = trpc.search.global.useQuery(
    { query, type: searchType },
    { enabled: query.length >= 2 && !useSemanticSearch }
  );

  // Semantic search
  const { data: semanticResults, isLoading: semanticLoading } = trpc.search.semantic.useQuery(
    { query, type: searchType },
    { enabled: query.length >= 2 && useSemanticSearch }
  );

  const results = useSemanticSearch ? semanticResults : textResults;
  const isLoading = useSemanticSearch ? semanticLoading : textLoading;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
  };

  const totalResults = (results?.articles?.length || 0) + (results?.sops?.length || 0);

  // Helper to format similarity score
  const formatSimilarity = (similarity: number) => {
    return Math.round(similarity * 100);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Suche</h1>
        <p className="text-muted-foreground mt-1">
          Durchsuchen Sie alle Wiki-Artikel und SOPs
        </p>
      </div>

      {/* Search Form */}
      <form onSubmit={handleSearch} className="space-y-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={useSemanticSearch 
                ? "Stellen Sie eine Frage in natürlicher Sprache..." 
                : "Suchbegriff eingeben (mind. 2 Zeichen)..."}
              className="pl-10"
            />
          </div>
          <Button type="submit" disabled={query.length < 2}>
            Suchen
          </Button>
        </div>

        {/* Semantic Search Toggle */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500/20 to-blue-500/20">
              <Sparkles className="h-4 w-4 text-purple-600" />
            </div>
            <div>
              <Label htmlFor="semantic-search" className="font-medium cursor-pointer">
                AI-gestützte Suche
              </Label>
              <p className="text-xs text-muted-foreground">
                Versteht den Kontext und findet relevante Ergebnisse auch ohne exakte Begriffe
              </p>
            </div>
          </div>
          <Switch
            id="semantic-search"
            checked={useSemanticSearch}
            onCheckedChange={setUseSemanticSearch}
          />
        </div>
      </form>

      {/* Results */}
      {query.length >= 2 && (
        <div>
          {/* Search Mode Indicator */}
          {results && (
            <div className="flex items-center gap-2 mb-4">
              {useSemanticSearch ? (
                <Badge variant="secondary" className="gap-1">
                  <Sparkles className="h-3 w-3" />
                  Semantische Suche
                </Badge>
              ) : (
                <Badge variant="outline" className="gap-1">
                  <Zap className="h-3 w-3" />
                  Textsuche
                </Badge>
              )}
              <span className="text-sm text-muted-foreground">
                {totalResults} Ergebnis{totalResults !== 1 ? "se" : ""} gefunden
              </span>
            </div>
          )}

          <Tabs value={searchType} onValueChange={(v) => setSearchType(v as typeof searchType)}>
            <div className="flex items-center justify-between mb-4">
              <TabsList>
                <TabsTrigger value="all">
                  Alle ({totalResults})
                </TabsTrigger>
                <TabsTrigger value="articles">
                  Artikel ({results?.articles?.length || 0})
                </TabsTrigger>
                <TabsTrigger value="sops">
                  SOPs ({results?.sops?.length || 0})
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="all" className="space-y-6">
              {/* Articles */}
              {results?.articles && results.articles.length > 0 && (
                <div>
                  <h3 className="text-lg font-medium mb-3">Artikel</h3>
                  <div className="space-y-3">
                    {results.articles.map((article) => (
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
                                <h4 className="font-medium">{article.title}</h4>
                                {useSemanticSearch && 'similarity' in article && article.similarity > 0 && (
                                  <Badge variant="secondary" className="text-xs">
                                    {formatSimilarity(article.similarity)}% Relevanz
                                  </Badge>
                                )}
                              </div>
                              {article.excerpt && (
                                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                  {article.excerpt}
                                </p>
                              )}
                              {'updatedAt' in article && (
                                <p className="text-xs text-muted-foreground mt-2">
                                  Aktualisiert{" "}
                                  {formatDistanceToNow(new Date(article.updatedAt), {
                                    addSuffix: true,
                                    locale: de,
                                  })}
                                </p>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* SOPs */}
              {results?.sops && results.sops.length > 0 && (
                <div>
                  <h3 className="text-lg font-medium mb-3">SOPs</h3>
                  <div className="space-y-3">
                    {results.sops.map((sop) => (
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
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium">{sop.title}</h4>
                                {useSemanticSearch && 'similarity' in sop && sop.similarity > 0 && (
                                  <Badge variant="secondary" className="text-xs">
                                    {formatSimilarity(sop.similarity)}% Relevanz
                                  </Badge>
                                )}
                              </div>
                              {sop.description && (
                                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                  {sop.description}
                                </p>
                              )}
                              {'updatedAt' in sop && (
                                <p className="text-xs text-muted-foreground mt-2">
                                  Aktualisiert{" "}
                                  {formatDistanceToNow(new Date(sop.updatedAt), {
                                    addSuffix: true,
                                    locale: de,
                                  })}
                                </p>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* No Results */}
              {totalResults === 0 && !isLoading && (
                <Card className="card-shadow">
                  <CardContent className="p-8 text-center">
                    <SearchIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      Keine Ergebnisse für "{query}" gefunden
                    </p>
                    {useSemanticSearch && (
                      <p className="text-sm text-muted-foreground mt-2">
                        Versuchen Sie es mit anderen Begriffen oder deaktivieren Sie die AI-Suche
                      </p>
                    )}
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="articles">
              {results?.articles && results.articles.length > 0 ? (
                <div className="space-y-3">
                  {results.articles.map((article) => (
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
                              <h4 className="font-medium">{article.title}</h4>
                              {useSemanticSearch && 'similarity' in article && article.similarity > 0 && (
                                <Badge variant="secondary" className="text-xs">
                                  {formatSimilarity(article.similarity)}% Relevanz
                                </Badge>
                              )}
                            </div>
                            {article.excerpt && (
                              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                {article.excerpt}
                              </p>
                            )}
                            {'updatedAt' in article && (
                              <p className="text-xs text-muted-foreground mt-2">
                                Aktualisiert{" "}
                                {formatDistanceToNow(new Date(article.updatedAt), {
                                  addSuffix: true,
                                  locale: de,
                                })}
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
                    <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">Keine Artikel gefunden</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="sops">
              {results?.sops && results.sops.length > 0 ? (
                <div className="space-y-3">
                  {results.sops.map((sop) => (
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
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium">{sop.title}</h4>
                              {useSemanticSearch && 'similarity' in sop && sop.similarity > 0 && (
                                <Badge variant="secondary" className="text-xs">
                                  {formatSimilarity(sop.similarity)}% Relevanz
                                </Badge>
                              )}
                            </div>
                            {sop.description && (
                              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                {sop.description}
                              </p>
                            )}
                            {'updatedAt' in sop && (
                              <p className="text-xs text-muted-foreground mt-2">
                                Aktualisiert{" "}
                                {formatDistanceToNow(new Date(sop.updatedAt), {
                                  addSuffix: true,
                                  locale: de,
                                })}
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
                    <ClipboardList className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">Keine SOPs gefunden</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      )}

      {/* Initial State */}
      {query.length < 2 && (
        <Card className="card-shadow">
          <CardContent className="p-8 text-center">
            <div className="p-4 rounded-full bg-gradient-to-br from-purple-500/20 to-blue-500/20 w-fit mx-auto mb-4">
              <Sparkles className="h-8 w-8 text-purple-600" />
            </div>
            <h3 className="font-medium mb-2">AI-gestützte Suche</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              Stellen Sie Fragen in natürlicher Sprache wie "Wie beantrage ich Urlaub?" 
              oder "Was ist der Prozess für Kundenreklamationen?"
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
