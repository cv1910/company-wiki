import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { FileText, Sparkles } from "lucide-react";
import { useLocation } from "wouter";

interface SimilarArticlesProps {
  articleId: number;
}

export function SimilarArticles({ articleId }: SimilarArticlesProps) {
  const [, setLocation] = useLocation();

  const { data: similarArticles, isLoading } = trpc.search.similar.useQuery(
    { articleId, limit: 4 },
    { enabled: !!articleId }
  );

  if (isLoading) {
    return (
      <Card className="card-shadow animate-pulse">
        <CardHeader className="pb-3">
          <div className="h-5 bg-muted rounded w-32" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-muted rounded" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!similarArticles || similarArticles.length === 0) {
    return null;
  }

  return (
    <Card className="card-shadow">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-purple-500" />
          Ähnliche Artikel
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {similarArticles.filter((a): a is NonNullable<typeof a> => a !== null).map((article) => (
          <div
            key={article.id}
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
            onClick={() => setLocation(`/wiki/article/${article.slug}`)}
          >
            <div className="p-1.5 rounded bg-primary/10">
              <FileText className="h-3.5 w-3.5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{article.title}</p>
            </div>
            {article.similarity && (
              <Badge variant="secondary" className="text-xs shrink-0">
                {Math.round(article.similarity * 100)}%
              </Badge>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
