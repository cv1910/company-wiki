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
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Eye, Save, Sparkles, Image, Upload } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useParams } from "wouter";
import { toast } from "sonner";
import { Streamdown } from "streamdown";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TemplateSelector from "@/components/TemplateSelector";
import { cn } from "@/lib/utils";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

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
  const [status, setStatus] = useState<"draft" | "published">("draft");
  const [isPinned, setIsPinned] = useState(false);
  const [changeDescription, setChangeDescription] = useState("");
  const [activeTab, setActiveTab] = useState("edit");
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: article, isLoading: articleLoading } = trpc.articles.getBySlug.useQuery(
    { slug: slug || "" },
    { enabled: isEditing }
  );

  const { data: categories } = trpc.categories.list.useQuery();

  const uploadMedia = trpc.media.upload.useMutation();

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

  useEffect(() => {
    if (article) {
      setTitle(article.title);
      setContent(article.content || "");
      setExcerpt(article.excerpt || "");
      setCategoryId(article.categoryId?.toString() || "");
      setStatus(article.status === "archived" ? "draft" : article.status);
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

  // Handle image upload
  const handleImageUpload = useCallback(
    async (file: File) => {
      if (!ALLOWED_TYPES.includes(file.type)) {
        toast.error("Ungültiger Dateityp. Erlaubt sind: JPG, PNG, GIF, WebP");
        return;
      }

      if (file.size > MAX_FILE_SIZE) {
        toast.error("Datei zu groß. Maximale Größe: 5MB");
        return;
      }

      setIsUploading(true);

      try {
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

        // Insert markdown at cursor position
        const markdown = `\n![${file.name}](${url})\n`;
        const textarea = textareaRef.current;
        if (textarea) {
          const start = textarea.selectionStart;
          const end = textarea.selectionEnd;
          const newContent = content.substring(0, start) + markdown + content.substring(end);
          setContent(newContent);
          // Set cursor after inserted markdown
          setTimeout(() => {
            textarea.selectionStart = textarea.selectionEnd = start + markdown.length;
            textarea.focus();
          }, 0);
        } else {
          setContent((prev) => prev + markdown);
        }

        toast.success("Bild eingefügt");
      } catch (error) {
        console.error("Upload error:", error);
        toast.error("Fehler beim Hochladen des Bildes");
      } finally {
        setIsUploading(false);
      }
    },
    [content, uploadMedia]
  );

  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.types.includes("Files")) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const files = Array.from(e.dataTransfer.files);
      const imageFile = files.find((f) => ALLOWED_TYPES.includes(f.type));

      if (imageFile) {
        handleImageUpload(imageFile);
      } else if (files.length > 0) {
        toast.error("Bitte nur Bilder hochladen (JPG, PNG, GIF, WebP)");
      }
    },
    [handleImageUpload]
  );

  // Paste handler for images
  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const items = Array.from(e.clipboardData.items);
      const imageItem = items.find((item) => item.type.startsWith("image/"));

      if (imageItem) {
        const file = imageItem.getAsFile();
        if (file) {
          e.preventDefault();
          handleImageUpload(file);
        }
      }
    },
    [handleImageUpload]
  );

  // File input handler
  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleImageUpload(file);
      }
      e.target.value = "";
    },
    [handleImageUpload]
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

  const handleSave = () => {
    if (!title.trim()) {
      toast.error("Bitte geben Sie einen Titel ein");
      return;
    }

    if (isEditing && article) {
      updateArticle.mutate({
        id: article.id,
        title,
        content,
        excerpt,
        categoryId: categoryId ? parseInt(categoryId) : null,
        status,
        isPinned,
        changeDescription: changeDescription || "Aktualisiert",
      });
    } else {
      createArticle.mutate({
        title,
        content,
        excerpt,
        categoryId: categoryId ? parseInt(categoryId) : undefined,
        status,
        isPinned,
      });
    }
  };

  const isSaving = createArticle.isPending || updateArticle.isPending;

  return (
    <div className="space-y-6">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={ALLOWED_TYPES.join(",")}
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Template Selector */}
      <TemplateSelector
        open={showTemplateSelector}
        onOpenChange={setShowTemplateSelector}
        onSelect={handleTemplateSelect}
      />

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
          <h1 className="text-2xl font-semibold tracking-tight">
            {isEditing ? "Artikel bearbeiten" : "Neuer Artikel"}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {!isEditing && (
            <Button variant="outline" onClick={() => setShowTemplateSelector(true)}>
              <Sparkles className="h-4 w-4 mr-2" />
              Vorlage
            </Button>
          )}
          <Button variant="outline" onClick={() => setActiveTab("preview")}>
            <Eye className="h-4 w-4 mr-2" />
            Vorschau
          </Button>
          <Button onClick={handleSave} disabled={isSaving} className="card-shadow">
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? "Speichern..." : "Speichern"}
          </Button>
        </div>
      </div>

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
                <div className="flex items-center justify-between mb-1.5">
                  <Label htmlFor="content">Inhalt (Markdown)</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Bild hochladen
                  </Button>
                </div>
                <div
                  className={cn(
                    "relative rounded-lg transition-all",
                    isDragging && "ring-2 ring-primary ring-offset-2"
                  )}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <Textarea
                    ref={textareaRef}
                    id="content"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    onPaste={handlePaste}
                    placeholder="Artikelinhalt in Markdown... (Bilder per Drag & Drop oder Strg+V einfügen)"
                    rows={20}
                    className="font-mono text-sm"
                    disabled={isUploading}
                  />

                  {/* Drag overlay */}
                  {isDragging && (
                    <div className="absolute inset-0 bg-primary/10 border-2 border-dashed border-primary rounded-lg flex items-center justify-center pointer-events-none">
                      <div className="bg-background/95 backdrop-blur-sm rounded-xl p-6 shadow-lg text-center">
                        <Image className="h-10 w-10 text-primary mx-auto mb-2" />
                        <p className="font-medium">Bild hier ablegen</p>
                      </div>
                    </div>
                  )}

                  {/* Upload indicator */}
                  {isUploading && (
                    <div className="absolute inset-0 bg-background/80 backdrop-blur-sm rounded-lg flex items-center justify-center">
                      <div className="flex items-center gap-3">
                        <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        <span className="font-medium">Bild wird hochgeladen...</span>
                      </div>
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1.5">
                  Tipp: Bilder per Drag & Drop oder aus der Zwischenablage (Strg+V) einfügen
                </p>
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
                  <div className="prose-wiki">
                    <Streamdown>{content || "Kein Inhalt"}</Streamdown>
                  </div>
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

              <div>
                <Label htmlFor="status">Status</Label>
                <Select
                  value={status}
                  onValueChange={(v) => setStatus(v as "draft" | "published")}
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Entwurf</SelectItem>
                    <SelectItem value="published">Veröffentlicht</SelectItem>
                  </SelectContent>
                </Select>
              </div>

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

          <Card className="card-shadow">
            <CardContent className="p-4">
              <h3 className="font-medium mb-2">Markdown-Hilfe</h3>
              <div className="text-sm text-muted-foreground space-y-1">
                <p><code># Überschrift 1</code></p>
                <p><code>## Überschrift 2</code></p>
                <p><code>**fett**</code></p>
                <p><code>*kursiv*</code></p>
                <p><code>[Link](url)</code></p>
                <p><code>![Bild](url)</code></p>
                <p><code>- Liste</code></p>
                <p><code>```code```</code></p>
              </div>
            </CardContent>
          </Card>

          <Card className="card-shadow bg-primary/5 border-primary/20">
            <CardContent className="p-4">
              <h3 className="font-medium mb-2 flex items-center gap-2">
                <Image className="h-4 w-4" />
                Bilder einfügen
              </h3>
              <div className="text-sm text-muted-foreground space-y-2">
                <p>• Bilder per Drag & Drop in den Editor ziehen</p>
                <p>• Aus Zwischenablage einfügen (Strg+V)</p>
                <p>• Über den "Bild hochladen" Button</p>
                <p className="text-xs mt-2">Max. 5MB • JPG, PNG, GIF, WebP</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
