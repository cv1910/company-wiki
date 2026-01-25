import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { Plus, Pencil, Trash2, Clock, Users, Briefcase } from "lucide-react";
import { toast } from "@/lib/hapticToast";

const employmentTypeLabels: Record<string, string> = {
  full_time: "Vollzeit",
  part_time: "Teilzeit",
  mini_job: "Minijob",
  student: "Werkstudent",
  intern: "Praktikant",
};

const employmentTypeColors: Record<string, string> = {
  full_time: "bg-green-100 text-green-800",
  part_time: "bg-blue-100 text-blue-800",
  mini_job: "bg-yellow-100 text-yellow-800",
  student: "bg-purple-100 text-purple-800",
  intern: "bg-orange-100 text-orange-800",
};

export default function AdminTargetHours() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    userId: "",
    monthlyHours: "160",
    weeklyHours: "40",
    employmentType: "full_time" as "full_time" | "part_time" | "mini_job" | "student" | "intern",
    validFrom: new Date().toISOString().split("T")[0],
    validUntil: "",
    notes: "",
  });

  const { data: targetHours, refetch } = trpc.targetWorkHours.getActive.useQuery();
  const { data: allUsers } = trpc.users.list.useQuery();
  const createMutation = trpc.targetWorkHours.create.useMutation({
    onSuccess: () => {
      toast.success("Soll-Stunden erfolgreich erstellt");
      setIsCreateOpen(false);
      resetForm();
      refetch();
    },
    onError: (error) => {
      toast.error(`Fehler: ${error.message}`);
    },
  });
  const updateMutation = trpc.targetWorkHours.update.useMutation({
    onSuccess: () => {
      toast.success("Soll-Stunden erfolgreich aktualisiert");
      setEditingId(null);
      resetForm();
      refetch();
    },
    onError: (error) => {
      toast.error(`Fehler: ${error.message}`);
    },
  });
  const deleteMutation = trpc.targetWorkHours.delete.useMutation({
    onSuccess: () => {
      toast.success("Soll-Stunden erfolgreich gelöscht");
      refetch();
    },
    onError: (error) => {
      toast.error(`Fehler: ${error.message}`);
    },
  });

  const resetForm = () => {
    setFormData({
      userId: "",
      monthlyHours: "160",
      weeklyHours: "40",
      employmentType: "full_time",
      validFrom: new Date().toISOString().split("T")[0],
      validUntil: "",
      notes: "",
    });
  };

  const handleCreate = () => {
    if (!formData.userId) {
      toast.error("Bitte wählen Sie einen Mitarbeiter aus");
      return;
    }
    createMutation.mutate({
      userId: parseInt(formData.userId),
      monthlyHours: formData.monthlyHours,
      weeklyHours: formData.weeklyHours,
      employmentType: formData.employmentType,
      validFrom: formData.validFrom,
      validUntil: formData.validUntil || undefined,
      notes: formData.notes || undefined,
    });
  };

  const handleUpdate = () => {
    if (!editingId) return;
    updateMutation.mutate({
      id: editingId,
      monthlyHours: formData.monthlyHours,
      weeklyHours: formData.weeklyHours,
      employmentType: formData.employmentType,
      validFrom: formData.validFrom,
      validUntil: formData.validUntil || null,
      notes: formData.notes || null,
    });
  };

  const handleEdit = (target: NonNullable<typeof targetHours>[0]) => {
    setFormData({
      userId: target.user.id.toString(),
      monthlyHours: target.target.monthlyHours,
      weeklyHours: target.target.weeklyHours,
      employmentType: target.target.employmentType,
      validFrom: new Date(target.target.validFrom).toISOString().split("T")[0],
      validUntil: target.target.validUntil ? new Date(target.target.validUntil).toISOString().split("T")[0] : "",
      notes: target.target.notes || "",
    });
    setEditingId(target.target.id);
  };

  const handleDelete = (id: number) => {
    if (confirm("Möchten Sie diese Soll-Stunden wirklich löschen?")) {
      deleteMutation.mutate({ id });
    }
  };

  // Calculate preset values based on employment type
  const handleEmploymentTypeChange = (type: typeof formData.employmentType) => {
    let monthly = "160";
    let weekly = "40";
    
    switch (type) {
      case "full_time":
        monthly = "160";
        weekly = "40";
        break;
      case "part_time":
        monthly = "80";
        weekly = "20";
        break;
      case "mini_job":
        monthly = "43";
        weekly = "10";
        break;
      case "student":
        monthly = "80";
        weekly = "20";
        break;
      case "intern":
        monthly = "160";
        weekly = "40";
        break;
    }
    
    setFormData({
      ...formData,
      employmentType: type,
      monthlyHours: monthly,
      weeklyHours: weekly,
    });
  };

  // Get users without target hours for the dropdown
  const usersWithoutTargets = allUsers?.filter(
    (user) => !targetHours?.some((t) => t.user.id === user.id)
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Soll-Stunden Verwaltung</h1>
            <p className="text-muted-foreground">
              Verwalten Sie die vertraglichen Arbeitsstunden pro Mitarbeiter
            </p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="mr-2 h-4 w-4" />
                Neue Soll-Stunden
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Neue Soll-Stunden erstellen</DialogTitle>
                <DialogDescription>
                  Legen Sie die vertraglichen Arbeitsstunden für einen Mitarbeiter fest.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Mitarbeiter</Label>
                  <Select
                    value={formData.userId}
                    onValueChange={(value) => setFormData({ ...formData, userId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Mitarbeiter auswählen" />
                    </SelectTrigger>
                    <SelectContent>
                      {usersWithoutTargets?.map((user) => (
                        <SelectItem key={user.id} value={user.id.toString()}>
                          {user.name || user.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Beschäftigungsart</Label>
                  <Select
                    value={formData.employmentType}
                    onValueChange={handleEmploymentTypeChange}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full_time">Vollzeit</SelectItem>
                      <SelectItem value="part_time">Teilzeit</SelectItem>
                      <SelectItem value="mini_job">Minijob</SelectItem>
                      <SelectItem value="student">Werkstudent</SelectItem>
                      <SelectItem value="intern">Praktikant</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Monatliche Stunden</Label>
                    <Input
                      type="number"
                      value={formData.monthlyHours}
                      onChange={(e) => setFormData({ ...formData, monthlyHours: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Wöchentliche Stunden</Label>
                    <Input
                      type="number"
                      value={formData.weeklyHours}
                      onChange={(e) => setFormData({ ...formData, weeklyHours: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Gültig ab</Label>
                    <Input
                      type="date"
                      value={formData.validFrom}
                      onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Gültig bis (optional)</Label>
                    <Input
                      type="date"
                      value={formData.validUntil}
                      onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Notizen (optional)</Label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="z.B. Sondervereinbarungen..."
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Abbrechen
                </Button>
                <Button onClick={handleCreate} disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Speichern..." : "Speichern"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Mitarbeiter mit Soll-Stunden</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{targetHours?.length || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Vollzeit-Mitarbeiter</CardTitle>
              <Briefcase className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {targetHours?.filter((t) => t.target.employmentType === "full_time").length || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Gesamt Soll-Stunden/Monat</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {targetHours?.reduce((sum, t) => sum + parseFloat(t.target.monthlyHours), 0).toFixed(0) || 0} h
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle>Aktive Soll-Stunden</CardTitle>
            <CardDescription>
              Übersicht aller aktuell gültigen Arbeitszeitvereinbarungen
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mitarbeiter</TableHead>
                  <TableHead>Beschäftigungsart</TableHead>
                  <TableHead className="text-right">Woche</TableHead>
                  <TableHead className="text-right">Monat</TableHead>
                  <TableHead>Gültig ab</TableHead>
                  <TableHead>Gültig bis</TableHead>
                  <TableHead className="text-right">Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {targetHours?.map((item) => (
                  <TableRow key={item.target.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={item.user.avatarUrl || undefined} />
                          <AvatarFallback>
                            {item.user.name?.charAt(0) || "?"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{item.user.name}</div>
                          <div className="text-sm text-muted-foreground">{item.user.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={employmentTypeColors[item.target.employmentType]}>
                        {employmentTypeLabels[item.target.employmentType]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {item.target.weeklyHours} h
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {item.target.monthlyHours} h
                    </TableCell>
                    <TableCell>
                      {new Date(item.target.validFrom).toLocaleDateString("de-DE")}
                    </TableCell>
                    <TableCell>
                      {item.target.validUntil
                        ? new Date(item.target.validUntil).toLocaleDateString("de-DE")
                        : "Unbefristet"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(item)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(item.target.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {(!targetHours || targetHours.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Keine Soll-Stunden konfiguriert. Erstellen Sie neue Einträge für Ihre Mitarbeiter.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={editingId !== null} onOpenChange={(open) => !open && setEditingId(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Soll-Stunden bearbeiten</DialogTitle>
              <DialogDescription>
                Ändern Sie die Arbeitszeitvereinbarung für diesen Mitarbeiter.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Beschäftigungsart</Label>
                <Select
                  value={formData.employmentType}
                  onValueChange={handleEmploymentTypeChange}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full_time">Vollzeit</SelectItem>
                    <SelectItem value="part_time">Teilzeit</SelectItem>
                    <SelectItem value="mini_job">Minijob</SelectItem>
                    <SelectItem value="student">Werkstudent</SelectItem>
                    <SelectItem value="intern">Praktikant</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Monatliche Stunden</Label>
                  <Input
                    type="number"
                    value={formData.monthlyHours}
                    onChange={(e) => setFormData({ ...formData, monthlyHours: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Wöchentliche Stunden</Label>
                  <Input
                    type="number"
                    value={formData.weeklyHours}
                    onChange={(e) => setFormData({ ...formData, weeklyHours: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Gültig ab</Label>
                  <Input
                    type="date"
                    value={formData.validFrom}
                    onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Gültig bis (optional)</Label>
                  <Input
                    type="date"
                    value={formData.validUntil}
                    onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Notizen (optional)</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="z.B. Sondervereinbarungen..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingId(null)}>
                Abbrechen
              </Button>
              <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Speichern..." : "Speichern"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
