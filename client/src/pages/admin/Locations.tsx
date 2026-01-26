import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, MapPin, Building2, GripVertical } from "lucide-react";

const COLORS = [
  { value: "rose", label: "Rosa", class: "bg-rose-500" },
  { value: "blue", label: "Blau", class: "bg-blue-500" },
  { value: "green", label: "Grün", class: "bg-green-500" },
  { value: "orange", label: "Orange", class: "bg-orange-500" },
  { value: "purple", label: "Lila", class: "bg-purple-500" },
  { value: "yellow", label: "Gelb", class: "bg-yellow-500" },
  { value: "cyan", label: "Cyan", class: "bg-cyan-500" },
  { value: "gray", label: "Grau", class: "bg-gray-500" },
];

export default function Locations() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<{
    id: number;
    name: string;
    shortName: string;
    address: string;
    description: string;
    color: string;
    isActive: boolean;
    sortOrder: number;
  } | null>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    shortName: "",
    address: "",
    description: "",
    color: "blue",
    sortOrder: 0,
  });

  const utils = trpc.useUtils();
  const { data: locations, isLoading } = trpc.locations.list.useQuery();
  
  const createMutation = trpc.locations.create.useMutation({
    onSuccess: () => {
      toast.success("Standort erstellt");
      utils.locations.list.invalidate();
      setIsCreateOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error("Fehler beim Erstellen: " + error.message);
    },
  });

  const updateMutation = trpc.locations.update.useMutation({
    onSuccess: () => {
      toast.success("Standort aktualisiert");
      utils.locations.list.invalidate();
      setEditingLocation(null);
    },
    onError: (error) => {
      toast.error("Fehler beim Aktualisieren: " + error.message);
    },
  });

  const deleteMutation = trpc.locations.delete.useMutation({
    onSuccess: () => {
      toast.success("Standort gelöscht");
      utils.locations.list.invalidate();
    },
    onError: (error) => {
      toast.error("Fehler beim Löschen: " + error.message);
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      shortName: "",
      address: "",
      description: "",
      color: "blue",
      sortOrder: 0,
    });
  };

  const handleCreate = () => {
    if (!formData.name || !formData.shortName) {
      toast.error("Name und Kürzel sind erforderlich");
      return;
    }
    createMutation.mutate(formData);
  };

  const handleUpdate = () => {
    if (!editingLocation) return;
    updateMutation.mutate({
      id: editingLocation.id,
      name: editingLocation.name,
      shortName: editingLocation.shortName,
      address: editingLocation.address || undefined,
      description: editingLocation.description || undefined,
      color: editingLocation.color,
      isActive: editingLocation.isActive,
      sortOrder: editingLocation.sortOrder,
    });
  };

  const handleDelete = (id: number) => {
    deleteMutation.mutate({ id });
  };

  const getColorClass = (color: string) => {
    return COLORS.find(c => c.value === color)?.class || "bg-gray-500";
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="h-32 bg-muted rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary" />
            Standorte verwalten
          </h1>
          <p className="text-muted-foreground mt-1">
            Verwalte die Standorte für den Schichtplan
          </p>
        </div>
        
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Neuer Standort
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Neuen Standort erstellen</DialogTitle>
              <DialogDescription>
                Füge einen neuen Standort für den Schichtplan hinzu.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  placeholder="z.B. Eppendorfer Landstrasse 60 (POS)"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="shortName">Kürzel *</Label>
                <Input
                  id="shortName"
                  placeholder="z.B. EL60"
                  maxLength={20}
                  value={formData.shortName}
                  onChange={(e) => setFormData({ ...formData, shortName: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  Wird im Schichtplan als kompakte Anzeige verwendet
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Adresse</Label>
                <Input
                  id="address"
                  placeholder="z.B. Eppendorfer Landstrasse 60, Hamburg"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Beschreibung</Label>
                <Textarea
                  id="description"
                  placeholder="Optionale Beschreibung des Standorts"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Farbe</Label>
                <div className="flex gap-2 flex-wrap">
                  {COLORS.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, color: color.value })}
                      className={`w-8 h-8 rounded-full ${color.class} ${
                        formData.color === color.value
                          ? "ring-2 ring-offset-2 ring-primary"
                          : ""
                      }`}
                      title={color.label}
                    />
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="sortOrder">Sortierung</Label>
                <Input
                  id="sortOrder"
                  type="number"
                  min={0}
                  value={formData.sortOrder}
                  onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                Abbrechen
              </Button>
              <Button onClick={handleCreate} disabled={createMutation.isPending}>
                {createMutation.isPending ? "Erstelle..." : "Erstellen"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {locations?.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium">Keine Standorte vorhanden</h3>
              <p className="text-muted-foreground mt-1">
                Erstelle deinen ersten Standort, um mit dem Schichtplan zu beginnen.
              </p>
            </CardContent>
          </Card>
        ) : (
          locations?.map((location) => (
            <Card key={location.id} className={!location.isActive ? "opacity-60" : ""}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded-full ${getColorClass(location.color || "gray")}`} />
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        {location.name}
                        <span className="text-sm font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded">
                          {location.shortName}
                        </span>
                        {!location.isActive && (
                          <span className="text-xs font-normal text-orange-600 bg-orange-100 px-2 py-0.5 rounded">
                            Inaktiv
                          </span>
                        )}
                      </CardTitle>
                      {location.address && (
                        <CardDescription className="mt-1 flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {location.address}
                        </CardDescription>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setEditingLocation({
                        id: location.id,
                        name: location.name,
                        shortName: location.shortName,
                        address: location.address || "",
                        description: location.description || "",
                        color: location.color || "gray",
                        isActive: location.isActive,
                        sortOrder: location.sortOrder,
                      })}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Standort löschen?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Möchtest du den Standort "{location.name}" wirklich löschen? 
                            Diese Aktion kann nicht rückgängig gemacht werden.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(location.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Löschen
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardHeader>
              {location.description && (
                <CardContent className="pt-0">
                  <p className="text-sm text-muted-foreground">{location.description}</p>
                </CardContent>
              )}
            </Card>
          ))
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingLocation} onOpenChange={(open) => !open && setEditingLocation(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Standort bearbeiten</DialogTitle>
            <DialogDescription>
              Bearbeite die Details des Standorts.
            </DialogDescription>
          </DialogHeader>
          {editingLocation && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Name *</Label>
                <Input
                  id="edit-name"
                  value={editingLocation.name}
                  onChange={(e) => setEditingLocation({ ...editingLocation, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-shortName">Kürzel *</Label>
                <Input
                  id="edit-shortName"
                  maxLength={20}
                  value={editingLocation.shortName}
                  onChange={(e) => setEditingLocation({ ...editingLocation, shortName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-address">Adresse</Label>
                <Input
                  id="edit-address"
                  value={editingLocation.address}
                  onChange={(e) => setEditingLocation({ ...editingLocation, address: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-description">Beschreibung</Label>
                <Textarea
                  id="edit-description"
                  value={editingLocation.description}
                  onChange={(e) => setEditingLocation({ ...editingLocation, description: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Farbe</Label>
                <div className="flex gap-2 flex-wrap">
                  {COLORS.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => setEditingLocation({ ...editingLocation, color: color.value })}
                      className={`w-8 h-8 rounded-full ${color.class} ${
                        editingLocation.color === color.value
                          ? "ring-2 ring-offset-2 ring-primary"
                          : ""
                      }`}
                      title={color.label}
                    />
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="edit-active">Aktiv</Label>
                <Switch
                  id="edit-active"
                  checked={editingLocation.isActive}
                  onCheckedChange={(checked) => setEditingLocation({ ...editingLocation, isActive: checked })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-sortOrder">Sortierung</Label>
                <Input
                  id="edit-sortOrder"
                  type="number"
                  min={0}
                  value={editingLocation.sortOrder}
                  onChange={(e) => setEditingLocation({ ...editingLocation, sortOrder: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingLocation(null)}>
              Abbrechen
            </Button>
            <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Speichere..." : "Speichern"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
