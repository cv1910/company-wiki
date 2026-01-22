import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Eye, Save, Sparkles, Send, Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useParams } from "wouter";
import { toast } from "sonner";
import { Streamdown } from "streamdown";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TemplateSelector from "@/components/TemplateSelector";
import TipTapEditor from "@/components/TipTapEditor";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

type ArticleStatus = "draft" | "pending_review" | "published" | "archived";

export default function WikiEditor() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const isEditing = !!slug;
  const isEditor = user?.role === "editor" || user?.role === "admin";

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [status, setStatus] = useState<ArticleStatus>("draft");
  const [isPinned, setIsPinned] = useState(false);
  const [changeDescription, setChangeDescription] = useState("");
  const [activeTab, setActiveTab] = useState("edit");
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewMessage, setReviewMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: article, isLoading: articleLoading } = trpc.articles.getBySlug.useQuery(
    { slug: slug || "" },
    { enabled: isEditing }
  );

  const { data: categories } = trpc.categories.list.useQuery();
  const { data: latestReview } = trpc.reviews.getLatest.useQuery(
    { articleId: article?.id || 0 },
    { enabled: !!article?.id }
  );

  const uploadMedia = trpc.media.upload.useMutation();
  const utils = trpc.useUtils();

  const createArticle = trpc.articles.create.useMutation({
    onSuccess: (data) => {
      toast.success("Artikel erstellt");
      setLocation(`/wiki/article/${data.slug}`);
    },
    onError: (error) => {
      toast.error(`Fehler: ${error.message}`);
    },
  });

  const updateArticle = trpc.articles.update.useMutation({
    onSuccess: () => {
      toast.success("Artikel aktualisiert");
      setLocation(`/wiki/article/${slug}`);
    },
    onError: (error) => {
      toast.error(`Fehler: ${error.message}`);
    },
  });

  const requestReview = trpc.reviews.requestReview.useMutation({
    onSuccess: () => {
      toast.success("Review-Anfrage gesendet");
      utils.reviews.getLatest.invalidate();
      setReviewDialogOpen(false);
      setReviewMessage("");
    },
    onError: (error) => {
      toast.error(`Fehler: ${error.message}`);
    },
  });

  useEffect(() => {
    if (article) {
      setTitle(article.title);
      setContent(article.content || "");
      setExcerpt(article.excerpt || "");
      setCategoryId(article.categoryId?.toString() || "");
      setStatus(article.status as ArticleStatus);
      setIsPinned(article.isPinned);
    }
  }, [article]);

  // Show template selector for new articles
  useEffect(() => {
    if (!isEditing && !content) {
      setShowTemplateSelector(true);
    }
  }, [isEditing, content]);

  // Upload file to S3
  const uploadToS3 = async (file: File): Promise<{ url: string; fileKey: string }> => {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error("Upload failed");
    }

    return response.json();
  };

  // Handle image upload for TipTap
  const handleImageUpload = useCallback(
    async (file: File): Promise<string> => {
      if (!ALLOWED_TYPES.includes(file.type)) {
        throw new Error("Ungültiger Dateityp");
      }

      if (file.size > MAX_FILE_SIZE) {
        throw new Error("Datei zu groß");
      }

      const { url, fileKey } = await uploadToS3(file);

      // Get image dimensions
      const img = new window.Image();
      img.src = URL.createObjectURL(file);
      await new Promise((resolve) => {
        img.onload = resolve;
      });

      // Save media metadata
      await uploadMedia.mutateAsync({
        filename: fileKey.split("/").pop() || file.name,
        originalFilename: file.name,
        mimeType: file.type,
        size: file.size,
        url,
        fileKey,
        width: img.width,
        height: img.height,
      });

      return url;
    },
    [uploadMedia]
  );

  // Template selection handler
  const handleTemplateSelect = (templateContent: string, templateName: string) => {
    setContent(templateContent);
    if (!title && templateName !== "Leere Seite") {
      setTitle(templateName.replace(/\[.*?\]/g, "").trim());
    }
    toast.success(`Vorlage "${templateName}" angewendet`);
  };

  if (!isEditor) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-medium mb-2">Keine Berechtigung</h2>
        <p className="text-muted-foreground mb-4">
          Sie haben keine Berechtigung, Artikel zu bearbeiten.
        </p>
        <Button variant="outline" onClick={() => setLocation("/wiki")}>
          Zurück zum Wiki
        </Button>
      </div>
    );
  }

  if (isEditing && articleLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-12 rounded-lg" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  const handleSave = (saveStatus?: ArticleStatus) => {
    if (!title.trim()) {
      toast.error("Bitte geben Sie einen Titel ein");
      return;
    }

    const finalStatus = saveStatus || status;

    if (isEditing && article) {
      updateArticle.mutate({
        id: article.id,
        title,
        content,
        excerpt,
        categoryId: categoryId ? parseInt(categoryId) : null,
        status: finalStatus === "pending_review" ? "draft" : finalStatus,
        isPinned,
        changeDescription: changeDescription || "Aktualisiert",
      });
    } else {
      createArticle.mutate({
        title,
        content,
        excerpt,
        categoryId: categoryId ? parseInt(categoryId) : undefined,
        status: finalStatus === "pending_review" ? "draft" : finalStatus,
        isPinned,
      });
    }
  };

  const handleRequestReview = () => {
    if (!article?.id) return;
    
    // First save the article
    updateArticle.mutate(
      {
        id: article.id,
        title,
        content,
        excerpt,
        categoryId: categoryId ? parseInt(categoryId) : null,
        status: "draft",
        isPinned,
        changeDescription: changeDescription || "Zur Review eingereicht",
      },
      {
        onSuccess: () => {
          // Then request review
          requestReview.mutate({
            articleId: article.id,
            message: reviewMessage,
          });
        },
      }
    );
  };

  const isSaving = createArticle.isPending || updateArticle.isPending;

  const getStatusBadge = () => {
    switch (status) {
      case "draft":
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Entwurf</Badge>;
      case "pending_review":
        return <Badge variant="outline" className="border-yellow-500 text-yellow-600"><AlertCircle className="h-3 w-3 mr-1" />Wartet auf Review</Badge>;
      case "published":
        return <Badge variant="default" className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Veröffentlicht</Badge>;
      case "archived":
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Archiviert</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Template Selector */}
      <TemplateSelector
        open={showTemplateSelector}
        onOpenChange={setShowTemplateSelector}
        onSelect={handleTemplateSelect}
      />

      {/* Review Request Dialog */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Review anfordern</DialogTitle>
            <DialogDescription>
              Ihr Artikel wird zur Überprüfung an einen Editor gesendet. Nach der Genehmigung wird er veröffentlicht.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="review-message">Nachricht an den Reviewer (optional)</Label>
              <Textarea
                id="review-message"
                value={reviewMessage}
                onChange={(e) => setReviewMessage(e.target.value)}
                placeholder="Gibt es etwas, das der Reviewer beachten sollte?"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button 
              onClick={handleRequestReview}
              disabled={requestReview.isPending || updateArticle.isPending}
            >
              <Send className="h-4 w-4 mr-2" />
              {requestReview.isPending ? "Wird gesendet..." : "Review anfordern"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation(isEditing ? `/wiki/article/${slug}` : "/wiki")}
            className="mb-2 -ml-2"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Zurück
          </Button>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">
              {isEditing ? "Artikel bearbeiten" : "Neuer Artikel"}
            </h1>
            {isEditing && getStatusBadge()}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!isEditing && (
            <Button variant="outline" size="sm" className="h-9" onClick={() => setShowTemplateSelector(true)}>
              <Sparkles className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Vorlage</span>
            </Button>
          )}
          <Button variant="outline" size="sm" className="h-9" onClick={() => setActiveTab("preview")}>
            <Eye className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Vorschau</span>
          </Button>
          <Button 
            variant="outline"
            size="sm"
            className="h-9"
            onClick={() => handleSave("draft")} 
            disabled={isSaving}
          >
            <Clock className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Als Entwurf</span>
          </Button>
          {isEditing && status !== "published" && user?.role !== "admin" && (
            <Button 
              size="sm"
              className="h-9 card-shadow"
              onClick={() => setReviewDialogOpen(true)} 
              disabled={isSaving}
            >
              <Send className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Zur Review</span>
            </Button>
          )}
          {(user?.role === "admin" || user?.role === "editor") && (
            <Button 
              size="sm"
              className="h-9 card-shadow bg-green-600 hover:bg-green-700"
              onClick={() => handleSave("published")} 
              disabled={isSaving}
            >
              <CheckCircle className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Veröffentlichen</span>
            </Button>
          )}
        </div>
      </div>

      {/* Review Status Banner */}
      {latestReview && latestReview.status !== "approved" && (
        <Card className={`border-l-4 ${
          latestReview.status === "pending" ? "border-l-yellow-500 bg-yellow-50" :
          latestReview.status === "changes_requested" ? "border-l-orange-500 bg-orange-50" :
          latestReview.status === "rejected" ? "border-l-red-500 bg-red-50" : ""
        }`}>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              {latestReview.status === "pending" && <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />}
              {latestReview.status === "changes_requested" && <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5" />}
              {latestReview.status === "rejected" && <XCircle className="h-5 w-5 text-red-600 mt-0.5" />}
              <div>
                <p className="font-medium">
                  {latestReview.status === "pending" && "Review ausstehend"}
                  {latestReview.status === "changes_requested" && "Änderungen angefordert"}
                  {latestReview.status === "rejected" && "Review abgelehnt"}
                </p>
                {latestReview.reviewMessage && (
                  <p className="text-sm text-muted-foreground mt-1">{latestReview.reviewMessage}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Editor */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="edit">Bearbeiten</TabsTrigger>
              <TabsTrigger value="preview">Vorschau</TabsTrigger>
            </TabsList>

            <TabsContent value="edit" className="space-y-4">
              <div>
                <Label htmlFor="title">Titel</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Artikeltitel eingeben..."
                  className="mt-1.5"
                />
              </div>

              <div>
                <Label htmlFor="excerpt">Kurzbeschreibung</Label>
                <Textarea
                  id="excerpt"
                  value={excerpt}
                  onChange={(e) => setExcerpt(e.target.value)}
                  placeholder="Kurze Beschreibung des Artikels..."
                  rows={2}
                  className="mt-1.5"
                />
              </div>

              <div>
                <Label className="mb-1.5 block">Inhalt</Label>
                <TipTapEditor
                  content={content}
                  onChange={setContent}
                  placeholder="Beginnen Sie mit dem Schreiben..."
                  onImageUpload={handleImageUpload}
                />
              </div>

              {isEditing && (
                <div>
                  <Label htmlFor="changeDescription">Änderungsbeschreibung</Label>
                  <Input
                    id="changeDescription"
                    value={changeDescription}
                    onChange={(e) => setChangeDescription(e.target.value)}
                    placeholder="Was wurde geändert?"
                    className="mt-1.5"
                  />
                </div>
              )}
            </TabsContent>

            <TabsContent value="preview">
              <Card className="card-shadow">
                <CardContent className="p-6">
                  <h1 className="text-2xl font-semibold mb-4">{title || "Kein Titel"}</h1>
                  {excerpt && (
                    <p className="text-muted-foreground mb-6">{excerpt}</p>
                  )}
                  <div className="prose-wiki" dangerouslySetInnerHTML={{ __html: content || "<p>Kein Inhalt</p>" }} />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card className="card-shadow">
            <CardContent className="p-4 space-y-4">
              <div>
                <Label htmlFor="category">Kategorie</Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="Kategorie auswählen" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Keine Kategorie</SelectItem>
                    {categories?.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id.toString()}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {(user?.role === "admin" || user?.role === "editor") && (
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={status}
                    onValueChange={(v) => setStatus(v as ArticleStatus)}
                  >
                    <SelectTrigger className="mt-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Entwurf</SelectItem>
                      <SelectItem value="pending_review">Wartet auf Review</SelectItem>
                      <SelectItem value="published">Veröffentlicht</SelectItem>
                      <SelectItem value="archived">Archiviert</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="flex items-center justify-between">
                <Label htmlFor="pinned">Angepinnt</Label>
                <Switch
                  id="pinned"
                  checked={isPinned}
                  onCheckedChange={setIsPinned}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="card-shadow bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <h3 className="font-medium mb-2 flex items-center gap-2">
                <Send className="h-4 w-4" />
                Veröffentlichungs-Workflow
              </h3>
              <div className="text-sm text-muted-foreground space-y-2">
                <p><strong>1. Entwurf:</strong> Artikel wird gespeichert, aber nicht sichtbar.</p>
                <p><strong>2. Review:</strong> Artikel wird zur Überprüfung eingereicht.</p>
                <p><strong>3. Veröffentlicht:</strong> Artikel ist für alle sichtbar.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
