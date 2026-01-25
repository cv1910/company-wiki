import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { 
  Plus, 
  Trash2, 
  FileText, 
  ClipboardList,
  User,
  CheckCircle2,
  Clock,
  Circle,
  GraduationCap
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";
import { toast } from "@/lib/hapticToast";

type Assignment = {
  assignment: {
    id: number;
    userId: number;
    resourceType: "article" | "sop";
    resourceId: number;
    resourceSlug: string;
    resourceTitle: string;
    status: "pending" | "in_progress" | "completed";
    dueDate: Date | null;
    assignedById: number;
    assignedAt: Date;
    startedAt: Date | null;
    completedAt: Date | null;
    notes: string | null;
  };
  user: {
    id: number;
    name: string | null;
    email: string | null;
    avatarUrl: string | null;
  } | null;
  assignedBy: {
    id: number;
    name: string | null;
  } | null;
};

export default function AdminAssignments() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [selectedResourceType, setSelectedResourceType] = useState<"article" | "sop">("article");
  const [selectedResource, setSelectedResource] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const utils = trpc.useUtils();

  const { data: assignments, isLoading } = trpc.assignments.list.useQuery({
    status: statusFilter !== "all" ? statusFilter : undefined,
  });

  const { data: users } = trpc.users.list.useQuery();
  const { data: articles } = trpc.articles.list.useQuery({ status: "published" });
  const { data: sops } = trpc.sops.list.useQuery({ status: "published" });

  const createMutation = trpc.assignments.create.useMutation({
    onSuccess: () => {
      toast.success("Zuweisung erstellt");
      utils.assignments.list.invalidate();
      setIsCreateOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(`Fehler: ${error.message}`);
    },
  });

  const deleteMutation = trpc.assignments.delete.useMutation({
    onSuccess: () => {
      toast.success("Zuweisung gelöscht");
      utils.assignments.list.invalidate();
    },
    onError: (error) => {
      toast.error(`Fehler: ${error.message}`);
    },
  });

  const resetForm = () => {
    setSelectedUser("");
    setSelectedResourceType("article");
    setSelectedResource("");
    setNotes("");
  };

  const handleCreate = () => {
    if (!selectedUser || !selectedResource) {
      toast.error("Bitte wählen Sie einen Benutzer und eine Ressource aus");
      return;
    }

    const resource = selectedResourceType === "article" 
      ? articles?.find(a => a.id.toString() === selectedResource)
      : sops?.find(s => s.id.toString() === selectedResource);

    if (!resource) {
      toast.error("Ressource nicht gefunden");
      return;
    }

    createMutation.mutate({
      userId: parseInt(selectedUser),
      resourceType: selectedResourceType,
      resourceId: resource.id,
      resourceSlug: resource.slug,
      resourceTitle: resource.title,
      notes: notes || undefined,
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20"><CheckCircle2 className="h-3 w-3 mr-1" />Abgeschlossen</Badge>;
      case "in_progress":
        return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20"><Clock className="h-3 w-3 mr-1" />In Bearbeitung</Badge>;
      default:
        return <Badge variant="secondary"><Circle className="h-3 w-3 mr-1" />Offen</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-primary" />
            Zuweisungen
          </h1>
          <p className="text-muted-foreground mt-1">
            Weisen Sie Mitarbeitern Artikel und SOPs zur Bearbeitung zu
          </p>
        </div>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Neue Zuweisung
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Neue Zuweisung erstellen</DialogTitle>
              <DialogDescription>
                Weisen Sie einem Mitarbeiter einen Artikel oder SOP zu
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Mitarbeiter</Label>
                <Select value={selectedUser} onValueChange={setSelectedUser}>
                  <SelectTrigger>
                    <SelectValue placeholder="Mitarbeiter auswählen" />
                  </SelectTrigger>
                  <SelectContent>
                    {users?.map((user) => (
                      <SelectItem key={user.id} value={user.id.toString()}>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          {user.name || user.email}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Typ</Label>
                <Select 
                  value={selectedResourceType} 
                  onValueChange={(v) => {
                    setSelectedResourceType(v as "article" | "sop");
                    setSelectedResource("");
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="article">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Wiki-Artikel
                      </div>
                    </SelectItem>
                    <SelectItem value="sop">
                      <div className="flex items-center gap-2">
                        <ClipboardList className="h-4 w-4" />
                        SOP
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{selectedResourceType === "article" ? "Artikel" : "SOP"}</Label>
                <Select value={selectedResource} onValueChange={setSelectedResource}>
                  <SelectTrigger>
                    <SelectValue placeholder={`${selectedResourceType === "article" ? "Artikel" : "SOP"} auswählen`} />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedResourceType === "article" ? (
                      articles?.map((article) => (
                        <SelectItem key={article.id} value={article.id.toString()}>
                          {article.title}
                        </SelectItem>
                      ))
                    ) : (
                      sops?.map((sop) => (
                        <SelectItem key={sop.id} value={sop.id.toString()}>
                          {sop.title}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Notizen (optional)</Label>
                <Textarea 
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Zusätzliche Anweisungen..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                Abbrechen
              </Button>
              <Button onClick={handleCreate} disabled={createMutation.isPending}>
                {createMutation.isPending ? "Wird erstellt..." : "Zuweisen"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Status filtern" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Status</SelectItem>
            <SelectItem value="pending">Offen</SelectItem>
            <SelectItem value="in_progress">In Bearbeitung</SelectItem>
            <SelectItem value="completed">Abgeschlossen</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Assignments Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 rounded-lg" />
              ))}
            </div>
          ) : assignments && assignments.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mitarbeiter</TableHead>
                  <TableHead>Inhalt</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Zugewiesen</TableHead>
                  <TableHead className="w-[100px]">Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignments.map((item: Assignment) => (
                  <TableRow key={item.assignment.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <div className="font-medium">{item.user?.name || "Unbekannt"}</div>
                          <div className="text-xs text-muted-foreground">{item.user?.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {item.assignment.resourceType === "article" ? (
                          <FileText className="h-4 w-4 text-blue-500" />
                        ) : (
                          <ClipboardList className="h-4 w-4 text-green-500" />
                        )}
                        <div>
                          <div className="font-medium">{item.assignment.resourceTitle}</div>
                          <div className="text-xs text-muted-foreground">
                            {item.assignment.resourceType === "article" ? "Artikel" : "SOP"}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(item.assignment.status)}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {formatDistanceToNow(new Date(item.assignment.assignedAt), {
                          addSuffix: true,
                          locale: de,
                        })}
                      </div>
                      {item.assignedBy?.name && (
                        <div className="text-xs text-muted-foreground">
                          von {item.assignedBy.name}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (confirm("Zuweisung wirklich löschen?")) {
                            deleteMutation.mutate({ id: item.assignment.id });
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <GraduationCap className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">Keine Zuweisungen vorhanden</p>
              <p className="text-sm text-muted-foreground mt-1">
                Erstellen Sie eine neue Zuweisung, um Mitarbeitern Inhalte zuzuweisen
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
