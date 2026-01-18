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
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation, useParams } from "wouter";
import { toast } from "sonner";

export default function SOPEditor() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const isEditing = !!slug;
  const isEditor = user?.role === "editor" || user?.role === "admin";

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [scribeUrl, setScribeUrl] = useState("");
  const [scribeEmbedCode, setScribeEmbedCode] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [status, setStatus] = useState<"draft" | "published">("draft");
  const [sortOrder, setSortOrder] = useState(0);

  const { data: sop, isLoading: sopLoading } = trpc.sops.getBySlug.useQuery(
    { slug: slug || "" },
    { enabled: isEditing }
  );

  const { data: categories } = trpc.sopCategories.list.useQuery();

  const createSOP = trpc.sops.create.useMutation({
    onSuccess: (data) => {
      toast.success("SOP erstellt");
      setLocation(`/sops/view/${data.slug}`);
    },
    onError: (error) => {
      toast.error(`Fehler: ${error.message}`);
    },
  });

  const updateSOP = trpc.sops.update.useMutation({
    onSuccess: () => {
      toast.success("SOP aktualisiert");
      setLocation(`/sops/view/${slug}`);
    },
    onError: (error) => {
      toast.error(`Fehler: ${error.message}`);
    },
  });

  useEffect(() => {
    if (sop) {
      setTitle(sop.title);
      setDescription(sop.description || "");
      setScribeUrl(sop.scribeUrl || "");
      setScribeEmbedCode(sop.scribeEmbedCode || "");
      setCategoryId(sop.categoryId?.toString() || "");
      setStatus(sop.status === "archived" ? "draft" : sop.status);
      setSortOrder(sop.sortOrder);
    }
  }, [sop]);

  if (!isEditor) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-medium mb-2">Keine Berechtigung</h2>
        <p className="text-muted-foreground mb-4">
          Sie haben keine Berechtigung, SOPs zu bearbeiten.
        </p>
        <Button variant="outline" onClick={() => setLocation("/sops")}>
          Zurück zu SOPs
        </Button>
      </div>
    );
  }

  if (isEditing && sopLoading) {
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

    if (isEditing && sop) {
      updateSOP.mutate({
        id: sop.id,
        title,
        description,
        scribeUrl: scribeUrl || undefined,
        scribeEmbedCode: scribeEmbedCode || undefined,
        categoryId: categoryId ? parseInt(categoryId) : null,
        status,
        sortOrder,
      });
    } else {
      createSOP.mutate({
        title,
        description,
        scribeUrl: scribeUrl || undefined,
        scribeEmbedCode: scribeEmbedCode || undefined,
        categoryId: categoryId ? parseInt(categoryId) : undefined,
        status,
        sortOrder,
      });
    }
  };

  const isSaving = createSOP.isPending || updateSOP.isPending;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation(isEditing ? `/sops/view/${slug}` : "/sops")}
            className="mb-2 -ml-2"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Zurück
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight">
            {isEditing ? "SOP bearbeiten" : "Neue SOP"}
          </h1>
        </div>
        <Button onClick={handleSave} disabled={isSaving} className="card-shadow">
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? "Speichern..." : "Speichern"}
        </Button>
      </div>

      {/* Editor */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Card className="card-shadow">
            <CardContent className="p-6 space-y-4">
              <div>
                <Label htmlFor="title">Titel</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="SOP-Titel eingeben..."
                  className="mt-1.5"
                />
              </div>

              <div>
                <Label htmlFor="description">Beschreibung</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Kurze Beschreibung der SOP..."
                  rows={3}
                  className="mt-1.5"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="card-shadow">
            <CardContent className="p-6 space-y-4">
              <h3 className="font-medium">Scribe-Integration</h3>
              <p className="text-sm text-muted-foreground">
                Fügen Sie einen Scribe-Link oder Embed-Code hinzu, um die SOP-Anleitung anzuzeigen.
              </p>

              <div>
                <Label htmlFor="scribeUrl">Scribe-URL</Label>
                <Input
                  id="scribeUrl"
                  value={scribeUrl}
                  onChange={(e) => setScribeUrl(e.target.value)}
                  placeholder="https://scribehow.com/shared/..."
                  className="mt-1.5"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Die URL Ihrer Scribe-Anleitung (z.B. https://scribehow.com/shared/...)
                </p>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">oder</span>
                </div>
              </div>

              <div>
                <Label htmlFor="scribeEmbedCode">Scribe Embed-Code</Label>
                <Textarea
                  id="scribeEmbedCode"
                  value={scribeEmbedCode}
                  onChange={(e) => setScribeEmbedCode(e.target.value)}
                  placeholder='<iframe src="..." ...></iframe>'
                  rows={4}
                  className="mt-1.5 font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Der vollständige Embed-Code von Scribe (falls vorhanden)
                </p>
              </div>
            </CardContent>
          </Card>
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

              <div>
                <Label htmlFor="sortOrder">Sortierung</Label>
                <Input
                  id="sortOrder"
                  type="number"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(parseInt(e.target.value) || 0)}
                  className="mt-1.5"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Niedrigere Zahlen werden zuerst angezeigt
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="card-shadow">
            <CardContent className="p-4">
              <h3 className="font-medium mb-2">Scribe-Hilfe</h3>
              <div className="text-sm text-muted-foreground space-y-2">
                <p>
                  1. Öffnen Sie Ihre Scribe-Anleitung
                </p>
                <p>
                  2. Klicken Sie auf "Share"
                </p>
                <p>
                  3. Kopieren Sie den Link oder Embed-Code
                </p>
                <p>
                  4. Fügen Sie ihn hier ein
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
