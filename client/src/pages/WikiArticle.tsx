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
  Trash2,
  CheckCircle,
  Reply,
  MoreVertical,
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
import { MentionTextarea } from "@/components/MentionTextarea";
import { toast } from "@/lib/hapticToast";
import ArticleFeedback from "@/components/ArticleFeedback";
import { SimilarArticles } from "@/components/SimilarArticles";
import { DiffViewer } from "@/components/DiffViewer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function WikiArticle() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [showHistory, setShowHistory] = useState(false);
  const [historyTab, setHistoryTab] = useState<"list" | "diff">("list");
  const [newComment, setNewComment] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState("");
  const [replyToId, setReplyToId] = useState<number | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const isEditor = user?.role === "editor" || user?.role === "admin";

  const { data: article, isLoading } = trpc.articles.getBySlug.useQuery(
    { slug: slug || "" },
    { enabled: !!slug }
  );

  const { data: versions } = trpc.versions.list.useQuery(
    { articleId: article?.id || 0 },
    { enabled: !!article?.id }
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
      setReplyContent("");
      setReplyToId(null);
      refetchComments();
      toast.success("Kommentar hinzugefügt");
    },
    onError: () => {
      toast.error("Fehler beim Hinzufügen des Kommentars");
    },
  });

  const updateComment = trpc.comments.update.useMutation({
    onSuccess: () => {
      setEditingCommentId(null);
      setEditContent("");
      refetchComments();
      toast.success("Kommentar aktualisiert");
    },
    onError: () => {
      toast.error("Fehler beim Aktualisieren des Kommentars");
    },
  });

  const deleteComment = trpc.comments.delete.useMutation({
    onSuccess: () => {
      refetchComments();
      toast.success("Kommentar gelöscht");
    },
    onError: () => {
      toast.error("Fehler beim Löschen des Kommentars");
    },
  });

  const resolveComment = trpc.comments.resolve.useMutation({
    onSuccess: () => {
      refetchComments();
      toast.success("Kommentar als gelöst markiert");
    },
    onError: () => {
      toast.error("Fehler beim Markieren des Kommentars");
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

  const handleReply = (parentId: number) => {
    if (!replyContent.trim() || !article?.id) return;
    createComment.mutate({
      articleId: article.id,
      content: replyContent.trim(),
      parentId,
    });
  };

  const handleEditComment = (id: number) => {
    if (!editContent.trim()) return;
    updateComment.mutate({ id, content: editContent.trim() });
  };

  const handleDeleteComment = (id: number) => {
    if (confirm("Kommentar wirklich löschen?")) {
      deleteComment.mutate({ id });
    }
  };

  const getInitials = (name: string | null) => {
    if (!name) return "?";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  // Organize comments into threads
  const topLevelComments = comments?.filter(c => !c.parentId) || [];
  const getReplies = (parentId: number) => comments?.filter(c => c.parentId === parentId) || [];

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

      {/* Similar Articles */}
      <SimilarArticles articleId={article.id} />

      {/* Feedback Widget */}
      <ArticleFeedback articleId={article.id} articleTitle={article.title} />

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
            <MentionTextarea
              placeholder="Kommentar hinzufügen... (@ für Erwähnungen)"
              value={newComment}
              onChange={setNewComment}
              rows={3}
            />
            <Button
              size="sm"
              onClick={handleAddComment}
              disabled={!newComment.trim() || createComment.isPending}
            >
              {createComment.isPending ? "Wird hinzugefügt..." : "Kommentar hinzufügen"}
            </Button>
          </div>

          {/* Comments List */}
          {topLevelComments.length > 0 ? (
            <div className="space-y-4 pt-4 border-t">
              {topLevelComments.map((comment) => (
                <div key={comment.id} className="space-y-3">
                  {/* Main Comment */}
                  <div className={`flex gap-3 p-3 rounded-lg ${comment.isResolved ? "bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800" : "bg-muted/30"}`}>
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="text-xs bg-primary/10 text-primary">
                        {getInitials(comment.user?.name || null)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium">{comment.user?.name || "Unbekannt"}</span>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(comment.createdAt), {
                              addSuffix: true,
                              locale: de,
                            })}
                          </span>
                          {comment.isResolved && (
                            <span className="text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <CheckCircle className="h-3 w-3" /> Gelöst
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          {/* Reply Button */}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => setReplyToId(replyToId === comment.id ? null : comment.id)}
                          >
                            <Reply className="h-3.5 w-3.5" />
                          </Button>
                          {/* Edit/Delete for own comments */}
                          {comment.userId === user?.id && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => {
                                  setEditingCommentId(comment.id);
                                  setEditContent(comment.content);
                                }}
                              >
                                <Edit className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive hover:text-destructive"
                                onClick={() => handleDeleteComment(comment.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          )}
                          {/* Resolve for editors */}
                          {isEditor && !comment.isResolved && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-green-600 hover:text-green-700"
                              onClick={() => resolveComment.mutate({ id: comment.id })}
                              title="Als gelöst markieren"
                            >
                              <CheckCircle className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>
                      
                      {/* Edit Mode */}
                      {editingCommentId === comment.id ? (
                        <div className="mt-2 space-y-2">
                          <Textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            rows={2}
                          />
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => handleEditComment(comment.id)} disabled={updateComment.isPending}>
                              Speichern
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setEditingCommentId(null)}>
                              Abbrechen
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm mt-1 whitespace-pre-wrap">{comment.content}</p>
                      )}
                    </div>
                  </div>

                  {/* Reply Form */}
                  {replyToId === comment.id && (
                    <div className="ml-12 space-y-2">
                      <MentionTextarea
                        placeholder="Antwort schreiben... (@ für Erwähnungen)"
                        value={replyContent}
                        onChange={setReplyContent}
                        rows={2}
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleReply(comment.id)} disabled={createComment.isPending}>
                          Antworten
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setReplyToId(null)}>
                          Abbrechen
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Replies */}
                  {getReplies(comment.id).length > 0 && (
                    <div className="ml-12 space-y-3 border-l-2 border-muted pl-4">
                      {getReplies(comment.id).map((reply) => (
                        <div key={reply.id} className={`flex gap-3 p-2 rounded-lg ${reply.isResolved ? "bg-green-50 dark:bg-green-950/20" : "bg-muted/20"}`}>
                          <Avatar className="h-7 w-7">
                            <AvatarFallback className="text-xs bg-primary/10 text-primary">
                              {getInitials(reply.user?.name || null)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">{reply.user?.name || "Unbekannt"}</span>
                                <span className="text-xs text-muted-foreground">
                                  {formatDistanceToNow(new Date(reply.createdAt), {
                                    addSuffix: true,
                                    locale: de,
                                  })}
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                {reply.userId === user?.id && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-destructive hover:text-destructive"
                                    onClick={() => handleDeleteComment(reply.id)}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                            </div>
                            <p className="text-sm mt-1 whitespace-pre-wrap">{reply.content}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-4">
              Noch keine Kommentare. Sei der Erste!
            </p>
          )}
        </CardContent>
      </Card>

      {/* Version History Dialog */}
      <Dialog open={showHistory} onOpenChange={setShowHistory}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Versionsverlauf</DialogTitle>
            <DialogDescription>
              Alle Versionen dieses Artikels
            </DialogDescription>
          </DialogHeader>
          <Tabs value={historyTab} onValueChange={(v) => setHistoryTab(v as "list" | "diff")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="list">Versionen</TabsTrigger>
              <TabsTrigger value="diff">Vergleichen</TabsTrigger>
            </TabsList>
            <TabsContent value="list">
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
            </TabsContent>
            <TabsContent value="diff">
              {versions && versions.length > 0 && (
                <DiffViewer
                  articleId={article.id}
                  versions={versions.map(v => ({
                    versionNumber: v.versionNumber,
                    title: v.title,
                    createdAt: v.createdAt,
                    changeDescription: v.changeDescription,
                  }))}
                />
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}
