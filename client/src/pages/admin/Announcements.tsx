import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
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
import { trpc } from "@/lib/trpc";
import { 
  Edit, 
  Megaphone, 
  Plus, 
  Trash2, 
  AlertTriangle, 
  Bell, 
  CheckCircle, 
  Info,
  Pin
} from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "@/lib/hapticToast";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";

type AnnouncementType = "info" | "warning" | "success" | "urgent";

export default function AdminAnnouncements() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [showDialog, setShowDialog] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [type, setType] = useState<AnnouncementType>("info");
  const [isPinned, setIsPinned] = useState(false);
  const [isActive, setIsActive] = useState(true);

  const utils = trpc.useUtils();

  const { data: announcements, isLoading } = trpc.announcements.getAll.useQuery();
  
  const createAnnouncement = trpc.announcements.create.useMutation({
    onSuccess: () => {
      toast.success("Ankündigung erstellt");
      utils.announcements.getAll.invalidate();
      utils.announcements.getActive.invalidate();
      resetForm();
    },
    onError: (e) => toast.error(e.message),
  });

  const updateAnnouncement = trpc.announcements.update.useMutation({
    onSuccess: () => {
      toast.success("Ankündigung aktualisiert");
      utils.announcements.getAll.invalidate();
      utils.announcements.getActive.invalidate();
      resetForm();
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteAnnouncement = trpc.announcements.delete.useMutation({
    onSuccess: () => {
      toast.success("Ankündigung gelöscht");
      utils.announcements.getAll.invalidate();
      utils.announcements.getActive.invalidate();
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
    setEditingAnnouncement(null);
    setTitle("");
    setContent("");
    setType("info");
    setIsPinned(false);
    setIsActive(true);
  };

  const handleEdit = (announcement: any) => {
    setEditingAnnouncement(announcement);
    setTitle(announcement.title);
    setContent(announcement.content);
    setType(announcement.type);
    setIsPinned(announcement.isPinned);
    setIsActive(announcement.isActive);
    setShowDialog(true);
  };

  const handleSave = () => {
    if (!title.trim()) {
      toast.error("Bitte geben Sie einen Titel ein");
      return;
    }
    if (!content.trim()) {
      toast.error("Bitte geben Sie einen Inhalt ein");
      return;
    }

    if (editingAnnouncement) {
      updateAnnouncement.mutate({
        id: editingAnnouncement.id,
        title,
        content,
        type,
        isPinned,
        isActive,
      });
    } else {
      createAnnouncement.mutate({
        title,
        content,
        type,
        isPinned,
      });
    }
  };

  const handleDelete = () => {
    if (!deleteId) return;
    deleteAnnouncement.mutate({ id: deleteId });
  };

  const handleToggleActive = (announcement: any) => {
    updateAnnouncement.mutate({
      id: announcement.id,
      isActive: !announcement.isActive,
    });
  };

  const getTypeIcon = (announcementType: string) => {
    switch (announcementType) {
      case "urgent": return <AlertTriangle className="h-4 w-4" />;
      case "warning": return <Bell className="h-4 w-4" />;
      case "success": return <CheckCircle className="h-4 w-4" />;
      default: return <Info className="h-4 w-4" />;
    }
  };

  const getTypeStyle = (announcementType: string) => {
    switch (announcementType) {
      case "urgent": return "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20";
      case "warning": return "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20";
      case "success": return "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20";
      default: return "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20";
    }
  };

  const getTypeBadgeVariant = (announcementType: string) => {
    switch (announcementType) {
      case "urgent": return "destructive";
      case "warning": return "secondary";
      case "success": return "default";
      default: return "outline";
    }
  };

  const isSaving = createAnnouncement.isPending || updateAnnouncement.isPending;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Ankündigungen verwalten</h1>
          <p className="text-muted-foreground mt-1">
            Erstellen und bearbeiten Sie unternehmensweite Ankündigungen
          </p>
        </div>
        <Button onClick={() => setShowDialog(true)} className="card-shadow">
          <Plus className="h-4 w-4 mr-2" />
          Neue Ankündigung
        </Button>
      </div>

      {/* Announcements List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : announcements && announcements.length > 0 ? (
        <div className="space-y-3">
          {announcements.map((announcement) => (
            <Card 
              key={announcement.id} 
              className={`overflow-hidden transition-all ${!announcement.isActive ? 'opacity-60' : ''}`}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className={`p-2.5 rounded-lg ${getTypeStyle(announcement.type)}`}>
                    {getTypeIcon(announcement.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="font-semibold">{announcement.title}</h3>
                      <Badge variant={getTypeBadgeVariant(announcement.type) as any} className="text-xs">
                        {announcement.type === "info" && "Information"}
                        {announcement.type === "warning" && "Warnung"}
                        {announcement.type === "success" && "Erfolg"}
                        {announcement.type === "urgent" && "Dringend"}
                      </Badge>
                      {announcement.isPinned && (
                        <Badge variant="secondary" className="text-xs">
                          <Pin className="h-3 w-3 mr-1" />
                          Angepinnt
                        </Badge>
                      )}
                      {!announcement.isActive && (
                        <Badge variant="outline" className="text-xs">
                          Inaktiv
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">{announcement.content}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Erstellt {formatDistanceToNow(new Date(announcement.createdAt), {
                        addSuffix: true,
                        locale: de,
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleActive(announcement)}
                      title={announcement.isActive ? "Deaktivieren" : "Aktivieren"}
                    >
                      {announcement.isActive ? "Deaktivieren" : "Aktivieren"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(announcement)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteId(announcement.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-12">
          <div className="text-center">
            <Megaphone className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Keine Ankündigungen</h3>
            <p className="text-muted-foreground mb-4">
              Erstellen Sie Ihre erste Ankündigung, um Mitarbeiter zu informieren.
            </p>
            <Button onClick={() => setShowDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Erste Ankündigung erstellen
            </Button>
          </div>
        </Card>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingAnnouncement ? "Ankündigung bearbeiten" : "Neue Ankündigung"}
            </DialogTitle>
            <DialogDescription>
              Erstellen Sie eine unternehmensweite Ankündigung für das Dashboard
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Titel</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Titel der Ankündigung"
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="content">Inhalt</Label>
              <Textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Nachricht für die Mitarbeiter..."
                rows={4}
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="type">Typ</Label>
              <Select value={type} onValueChange={(v) => setType(v as AnnouncementType)}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">
                    <div className="flex items-center gap-2">
                      <Info className="h-4 w-4 text-blue-500" />
                      Information
                    </div>
                  </SelectItem>
                  <SelectItem value="success">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Erfolg
                    </div>
                  </SelectItem>
                  <SelectItem value="warning">
                    <div className="flex items-center gap-2">
                      <Bell className="h-4 w-4 text-amber-500" />
                      Warnung
                    </div>
                  </SelectItem>
                  <SelectItem value="urgent">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                      Dringend
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="pinned">Angepinnt</Label>
                <p className="text-xs text-muted-foreground">
                  Angepinnte Ankündigungen werden hervorgehoben
                </p>
              </div>
              <Switch
                id="pinned"
                checked={isPinned}
                onCheckedChange={setIsPinned}
              />
            </div>

            {editingAnnouncement && (
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="active">Aktiv</Label>
                  <p className="text-xs text-muted-foreground">
                    Nur aktive Ankündigungen werden angezeigt
                  </p>
                </div>
                <Switch
                  id="active"
                  checked={isActive}
                  onCheckedChange={setIsActive}
                />
              </div>
            )}
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
            <AlertDialogTitle>Ankündigung löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Diese Aktion kann nicht rückgängig gemacht werden. Die Ankündigung wird
              dauerhaft gelöscht.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete} 
              className="bg-destructive text-destructive-foreground"
            >
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
