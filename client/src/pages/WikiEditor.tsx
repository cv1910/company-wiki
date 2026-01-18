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
import { ArrowLeft, Eye, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation, useParams } from "wouter";
import { toast } from "sonner";
import { Streamdown } from "streamdown";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

  const { data: article, isLoading: articleLoading } = trpc.articles.getBySlug.useQuery(
    { slug: slug || "" },
    { enabled: isEditing }
  );

  const { data: categories } = trpc.categories.list.useQuery();

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
                <Label htmlFor="content">Inhalt (Markdown)</Label>
                <Textarea
                  id="content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Artikelinhalt in Markdown..."
                  rows={20}
                  className="mt-1.5 font-mono text-sm"
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
                <p><code>- Liste</code></p>
                <p><code>```code```</code></p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
