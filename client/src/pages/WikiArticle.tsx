import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { trpc } from "@/lib/trpc";
import {
  ArrowLeft,
  Clock,
  Edit,
  Eye,
  FileText,
  History,
  MessageSquare,
  Share2,
} from "lucide-react";
import { useLocation, useParams } from "wouter";
import { formatDistanceToNow, format } from "date-fns";
import { de } from "date-fns/locale";
import { Streamdown } from "streamdown";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export default function WikiArticle() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [showHistory, setShowHistory] = useState(false);
  const [newComment, setNewComment] = useState("");
  const isEditor = user?.role === "editor" || user?.role === "admin";

  const { data: article, isLoading } = trpc.articles.getBySlug.useQuery(
    { slug: slug || "" },
    { enabled: !!slug }
  );

  const { data: versions } = trpc.versions.list.useQuery(
    { articleId: article?.id || 0 },
    { enabled: !!article?.id && showHistory }
  );

  const { data: comments, refetch: refetchComments } = trpc.comments.getByArticle.useQuery(
    { articleId: article?.id || 0 },
    { enabled: !!article?.id }
  );

  const { data: author } = trpc.users.getById.useQuery(
    { id: article?.createdById || 0 },
    { enabled: !!article?.createdById }
  );

  const { data: category } = trpc.categories.getById.useQuery(
    { id: article?.categoryId || 0 },
    { enabled: !!article?.categoryId }
  );

  const createComment = trpc.comments.create.useMutation({
    onSuccess: () => {
      setNewComment("");
      refetchComments();
      toast.success("Kommentar hinzugefügt");
    },
    onError: () => {
      toast.error("Fehler beim Hinzufügen des Kommentars");
    },
  });

  const restoreVersion = trpc.versions.restore.useMutation({
    onSuccess: () => {
      setShowHistory(false);
      toast.success("Version wiederhergestellt");
      window.location.reload();
    },
    onError: () => {
      toast.error("Fehler beim Wiederherstellen der Version");
    },
  });

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Link in die Zwischenablage kopiert");
  };

  const handleAddComment = () => {
    if (!newComment.trim() || !article?.id) return;
    createComment.mutate({
      articleId: article.id,
      content: newComment.trim(),
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-96" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (!article) {
    return (
      <div className="text-center py-12">
        <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-xl font-medium mb-2">Artikel nicht gefunden</h2>
        <p className="text-muted-foreground mb-4">
          Der angeforderte Artikel existiert nicht.
        </p>
        <Button variant="outline" onClick={() => setLocation("/wiki")}>
          Zurück zum Wiki
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
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

        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              {category && (
                <span
                  className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full cursor-pointer hover:bg-primary/20 transition-colors"
                  onClick={() => setLocation(`/wiki/category/${category.slug}`)}
                >
                  {category.name}
                </span>
              )}
              {article.isPinned && (
                <span className="text-xs bg-orange-500/10 text-orange-600 px-2 py-1 rounded-full">
                  Angepinnt
                </span>
              )}
            </div>
            <h1 className="text-2xl font-semibold tracking-tight">{article.title}</h1>
            <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <span>
                  {formatDistanceToNow(new Date(article.updatedAt), {
                    addSuffix: true,
                    locale: de,
                  })}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Eye className="h-4 w-4" />
                <span>{article.viewCount} Aufrufe</span>
              </div>
              {author && (
                <div className="flex items-center gap-1">
                  <Avatar className="h-5 w-5">
                    <AvatarFallback className="text-[10px]">
                      {author.name?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span>{author.name}</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleShare}>
              <Share2 className="h-4 w-4 mr-2" />
              Teilen
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowHistory(true)}>
              <History className="h-4 w-4 mr-2" />
              Verlauf
            </Button>
            {isEditor && (
              <Button size="sm" onClick={() => setLocation(`/wiki/edit/${article.slug}`)}>
                <Edit className="h-4 w-4 mr-2" />
                Bearbeiten
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <Card className="card-shadow">
        <CardContent className="p-6 lg:p-8">
          <div className="prose-wiki">
            <Streamdown>{article.content || "Kein Inhalt vorhanden."}</Streamdown>
          </div>
        </CardContent>
      </Card>

      {/* Comments */}
      <Card className="card-shadow">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Kommentare ({comments?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add Comment */}
          <div className="space-y-2">
            <Textarea
              placeholder="Kommentar hinzufügen..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              rows={3}
            />
            <Button
              size="sm"
              onClick={handleAddComment}
              disabled={!newComment.trim() || createComment.isPending}
            >
              Kommentar hinzufügen
            </Button>
          </div>

          {/* Comments List */}
          {comments && comments.length > 0 ? (
            <div className="space-y-4 pt-4 border-t">
              {comments.map((comment) => (
                <div key={comment.id} className="flex gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs">U</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Benutzer</span>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(comment.createdAt), {
                          addSuffix: true,
                          locale: de,
                        })}
                      </span>
                    </div>
                    <p className="text-sm mt-1">{comment.content}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-4">
              Noch keine Kommentare
            </p>
          )}
        </CardContent>
      </Card>

      {/* Version History Dialog */}
      <Dialog open={showHistory} onOpenChange={setShowHistory}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Versionsverlauf</DialogTitle>
            <DialogDescription>
              Alle Versionen dieses Artikels
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            {versions && versions.length > 0 ? (
              <div className="space-y-3">
                {versions.map((version) => (
                  <div
                    key={version.id}
                    className="p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Version {version.versionNumber}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(version.createdAt), "dd.MM.yyyy HH:mm", {
                            locale: de,
                          })}
                        </p>
                        {version.changeDescription && (
                          <p className="text-sm mt-1">{version.changeDescription}</p>
                        )}
                      </div>
                      {isEditor && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            restoreVersion.mutate({
                              articleId: article.id,
                              versionNumber: version.versionNumber,
                            })
                          }
                          disabled={restoreVersion.isPending}
                        >
                          Wiederherstellen
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                Keine Versionen gefunden
              </p>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
