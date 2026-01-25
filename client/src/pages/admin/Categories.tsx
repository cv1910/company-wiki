import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { Edit, FolderOpen, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "@/lib/hapticToast";

export default function AdminCategories() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<"wiki" | "sop">("wiki");
  const [showDialog, setShowDialog] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [parentId, setParentId] = useState<string>("");

  const utils = trpc.useUtils();

  // Wiki Categories
  const { data: wikiCategories, isLoading: wikiLoading } = trpc.categories.list.useQuery();
  const createWikiCategory = trpc.categories.create.useMutation({
    onSuccess: () => {
      toast.success("Kategorie erstellt");
      utils.categories.list.invalidate();
      resetForm();
    },
    onError: (e) => toast.error(e.message),
  });
  const updateWikiCategory = trpc.categories.update.useMutation({
    onSuccess: () => {
      toast.success("Kategorie aktualisiert");
      utils.categories.list.invalidate();
      resetForm();
    },
    onError: (e) => toast.error(e.message),
  });
  const deleteWikiCategory = trpc.categories.delete.useMutation({
    onSuccess: () => {
      toast.success("Kategorie gelöscht");
      utils.categories.list.invalidate();
      setDeleteId(null);
    },
    onError: (e) => toast.error(e.message),
  });

  // SOP Categories
  const { data: sopCategories, isLoading: sopLoading } = trpc.sopCategories.list.useQuery();
  const createSOPCategory = trpc.sopCategories.create.useMutation({
    onSuccess: () => {
      toast.success("SOP-Kategorie erstellt");
      utils.sopCategories.list.invalidate();
      resetForm();
    },
    onError: (e) => toast.error(e.message),
  });
  const updateSOPCategory = trpc.sopCategories.update.useMutation({
    onSuccess: () => {
      toast.success("SOP-Kategorie aktualisiert");
      utils.sopCategories.list.invalidate();
      resetForm();
    },
    onError: (e) => toast.error(e.message),
  });
  const deleteSOPCategory = trpc.sopCategories.delete.useMutation({
    onSuccess: () => {
      toast.success("SOP-Kategorie gelöscht");
      utils.sopCategories.list.invalidate();
      setDeleteId(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const isAdmin = user?.role === "admin";

  if (!isAdmin) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-medium mb-2">Keine Berechtigung</h2>
        <p className="text-muted-foreground mb-4">
          Sie haben keine Berechtigung, diese Seite zu sehen.
        </p>
        <Button variant="outline" onClick={() => setLocation("/")}>
          Zurück zum Dashboard
        </Button>
      </div>
    );
  }

  const resetForm = () => {
    setShowDialog(false);
    setEditingCategory(null);
    setName("");
    setDescription("");
    setParentId("");
  };

  const handleEdit = (category: any) => {
    setEditingCategory(category);
    setName(category.name);
    setDescription(category.description || "");
    setParentId(category.parentId?.toString() || "");
    setShowDialog(true);
  };

  const handleSave = () => {
    if (!name.trim()) {
      toast.error("Bitte geben Sie einen Namen ein");
      return;
    }

    const data = {
      name,
      description: description || undefined,
      parentId: parentId ? parseInt(parentId) : undefined,
    };

    if (activeTab === "wiki") {
      if (editingCategory) {
        updateWikiCategory.mutate({ id: editingCategory.id, ...data });
      } else {
        createWikiCategory.mutate(data);
      }
    } else {
      if (editingCategory) {
        updateSOPCategory.mutate({ id: editingCategory.id, ...data });
      } else {
        createSOPCategory.mutate(data);
      }
    }
  };

  const handleDelete = () => {
    if (!deleteId) return;
    if (activeTab === "wiki") {
      deleteWikiCategory.mutate({ id: deleteId });
    } else {
      deleteSOPCategory.mutate({ id: deleteId });
    }
  };

  const categories = activeTab === "wiki" ? wikiCategories : sopCategories;
  const isLoading = activeTab === "wiki" ? wikiLoading : sopLoading;
  const isSaving =
    createWikiCategory.isPending ||
    updateWikiCategory.isPending ||
    createSOPCategory.isPending ||
    updateSOPCategory.isPending;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Kategorien verwalten</h1>
          <p className="text-muted-foreground mt-1">
            Erstellen und bearbeiten Sie Wiki- und SOP-Kategorien
          </p>
        </div>
        <Button onClick={() => setShowDialog(true)} className="card-shadow">
          <Plus className="h-4 w-4 mr-2" />
          Neue Kategorie
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "wiki" | "sop")}>
        <TabsList>
          <TabsTrigger value="wiki">Wiki-Kategorien</TabsTrigger>
          <TabsTrigger value="sop">SOP-Kategorien</TabsTrigger>
        </TabsList>

        <TabsContent value="wiki" className="mt-4">
          <CategoryList
            categories={wikiCategories}
            isLoading={wikiLoading}
            onEdit={handleEdit}
            onDelete={setDeleteId}
          />
        </TabsContent>

        <TabsContent value="sop" className="mt-4">
          <CategoryList
            categories={sopCategories}
            isLoading={sopLoading}
            onEdit={handleEdit}
            onDelete={setDeleteId}
          />
        </TabsContent>
      </Tabs>

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? "Kategorie bearbeiten" : "Neue Kategorie"}
            </DialogTitle>
            <DialogDescription>
              {activeTab === "wiki" ? "Wiki-Kategorie" : "SOP-Kategorie"} erstellen oder bearbeiten
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Kategoriename"
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="description">Beschreibung</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optionale Beschreibung"
                rows={3}
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="parent">Übergeordnete Kategorie</Label>
              <Select value={parentId} onValueChange={setParentId}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Keine (Hauptkategorie)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Keine (Hauptkategorie)</SelectItem>
                  {categories
                    ?.filter((c) => c.id !== editingCategory?.id)
                    .map((cat) => (
                      <SelectItem key={cat.id} value={cat.id.toString()}>
                        {cat.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={resetForm}>
              Abbrechen
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Speichern..." : "Speichern"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Kategorie löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Diese Aktion kann nicht rückgängig gemacht werden. Alle Artikel in dieser
              Kategorie werden keiner Kategorie mehr zugeordnet.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function CategoryList({
  categories,
  isLoading,
  onEdit,
  onDelete,
}: {
  categories: any[] | undefined;
  isLoading: boolean;
  onEdit: (cat: any) => void;
  onDelete: (id: number) => void;
}) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
    );
  }

  if (!categories || categories.length === 0) {
    return (
      <Card className="card-shadow">
        <CardContent className="p-8 text-center">
          <FolderOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Noch keine Kategorien vorhanden</p>
        </CardContent>
      </Card>
    );
  }

  // Group by parent
  const rootCategories = categories.filter((c) => !c.parentId);
  const getChildren = (parentId: number) => categories.filter((c) => c.parentId === parentId);

  return (
    <div className="space-y-3">
      {rootCategories.map((category) => (
        <div key={category.id}>
          <Card className="card-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <FolderOpen className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{category.name}</p>
                    {category.description && (
                      <p className="text-sm text-muted-foreground">{category.description}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => onEdit(category)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(category.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Children */}
          {getChildren(category.id).length > 0 && (
            <div className="ml-8 mt-2 space-y-2">
              {getChildren(category.id).map((child) => (
                <Card key={child.id} className="card-shadow">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-1.5 rounded-lg bg-muted">
                          <FolderOpen className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{child.name}</p>
                          {child.description && (
                            <p className="text-xs text-muted-foreground">{child.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" onClick={() => onEdit(child)}>
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDelete(child.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
