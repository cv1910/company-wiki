import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import {
  Plus,
  ClipboardCheck,
  Clock,
  CheckCircle2,
  Circle,
  X,
  Calendar,
  User,
  AlertTriangle,
  ChevronDown,
  Trash2,
  MessageCircle,
  Send,
  MoreVertical,
  Edit2,
  Repeat,
  Filter,
} from "lucide-react";
import { useLocation, Link } from "wouter";
import { formatDistanceToNow, format } from "date-fns";
import { de } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useMemo, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/EmptyState";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";

const PRIORITY_CONFIG = {
  low: { label: "Niedrig", color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" },
  medium: { label: "Mittel", color: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" },
  high: { label: "Hoch", color: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300" },
  urgent: { label: "Dringend", color: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300" },
};

const STATUS_CONFIG = {
  open: { label: "Offen", color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300", icon: Circle },
  in_progress: { label: "In Bearbeitung", color: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300", icon: Clock },
  completed: { label: "Erledigt", color: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300", icon: CheckCircle2 },
  cancelled: { label: "Abgebrochen", color: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300", icon: X },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function TaskCard({ 
  task, 
  onStatusChange, 
  onDelete,
  onComment,
  showAssignee = true 
}: { 
  task: any;
  onStatusChange: (id: number, status: "open" | "in_progress" | "completed" | "cancelled") => void;
  onDelete: (id: number) => void;
  onComment: (id: number) => void;
  showAssignee?: boolean;
}) {
  const status = task.task.status as keyof typeof STATUS_CONFIG;
  const priority = task.task.priority as keyof typeof PRIORITY_CONFIG;
  const statusConfig = STATUS_CONFIG[status];
  const priorityConfig = PRIORITY_CONFIG[priority];
  const StatusIcon = statusConfig.icon;
  const isOverdue = task.task.dueDate && new Date(task.task.dueDate) < new Date() && task.task.status !== "completed";

  return (
    <div className="group relative p-4 rounded-xl border bg-card hover:shadow-md transition-all duration-200">
      <div className="flex items-start gap-3">
        {/* Status Toggle */}
        <button
          onClick={() => {
            if (task.task.status === "completed") {
              onStatusChange(task.task.id, "open");
            } else {
              onStatusChange(task.task.id, "completed");
            }
          }}
          className={`mt-0.5 p-1 rounded-full transition-colors ${
            task.task.status === "completed" 
              ? "text-green-600 hover:text-green-700" 
              : "text-muted-foreground hover:text-primary"
          }`}
        >
          {task.task.status === "completed" ? (
            <CheckCircle2 className="h-5 w-5" />
          ) : (
            <Circle className="h-5 w-5" />
          )}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className={`font-medium ${task.task.status === "completed" ? "line-through text-muted-foreground" : ""}`}>
              {task.task.title}
            </h3>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Badge variant="secondary" className={priorityConfig.color}>
                {priorityConfig.label}
              </Badge>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onStatusChange(task.task.id, "open")}>
                    <Circle className="h-4 w-4 mr-2" /> Offen
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onStatusChange(task.task.id, "in_progress")}>
                    <Clock className="h-4 w-4 mr-2" /> In Bearbeitung
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onStatusChange(task.task.id, "completed")}>
                    <CheckCircle2 className="h-4 w-4 mr-2" /> Erledigt
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onStatusChange(task.task.id, "cancelled")}>
                    <X className="h-4 w-4 mr-2" /> Abgebrochen
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => onDelete(task.task.id)}
                    className="text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" /> Löschen
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {task.task.description && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
              {task.task.description}
            </p>
          )}

          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
            {task.task.dueDate && (
              <div className={`flex items-center gap-1 ${isOverdue ? "text-red-600" : ""}`}>
                {isOverdue && <AlertTriangle className="h-3 w-3" />}
                <Calendar className="h-3 w-3" />
                <span>{format(new Date(task.task.dueDate), "dd.MM.yyyy", { locale: de })}</span>
              </div>
            )}
            {showAssignee && task.assignedTo && (
              <div className="flex items-center gap-1">
                <Avatar className="h-4 w-4">
                  <AvatarImage src={task.assignedTo.avatarUrl || undefined} />
                  <AvatarFallback className="text-[8px]">
                    {task.assignedTo.name?.charAt(0) || "?"}
                  </AvatarFallback>
                </Avatar>
                <span>{task.assignedTo.name || "Unbekannt"}</span>
              </div>
            )}
            <Badge variant="secondary" className={`${statusConfig.color} text-[10px] px-1.5 py-0`}>
              <StatusIcon className="h-2.5 w-2.5 mr-1" />
              {statusConfig.label}
            </Badge>
            {task.task.recurrencePattern && task.task.recurrencePattern !== "none" && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                <Repeat className="h-2.5 w-2.5 mr-1" />
                {task.task.recurrencePattern === "daily" ? "Täglich" : task.task.recurrencePattern === "weekly" ? "Wöchentlich" : "Monatlich"}
              </Badge>
            )}
            <button
              onClick={() => onComment(task.task.id)}
              className="flex items-center gap-1 hover:text-primary transition-colors"
            >
              <MessageCircle className="h-3 w-3" />
              <span>Kommentare</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Aufgaben() {
  const { user, isAuthenticated } = useAuth();
  const authLoading = !isAuthenticated && !user;
  const [location] = useLocation();
  const [, setLocation] = useLocation();
  const isNewRoute = location === "/aufgaben/new";
  
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "open" | "completed">("all");
  const [filterPriority, setFilterPriority] = useState<"all" | "low" | "medium" | "high" | "urgent">("all");
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [commentDialogOpen, setCommentDialogOpen] = useState(false);
  const [newComment, setNewComment] = useState("");

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high" | "urgent">("medium");
  const [dueDate, setDueDate] = useState("");
  const [assignedToId, setAssignedToId] = useState<number | null>(null);
  const [recurrencePattern, setRecurrencePattern] = useState<"none" | "daily" | "weekly" | "monthly">("none");
  const [recurrenceEndDate, setRecurrenceEndDate] = useState("");
  const [reminderDays, setReminderDays] = useState<number>(0);

  // Queries
  const { data: myTasks, isLoading: myTasksLoading, refetch: refetchMyTasks } = trpc.tasks.getMyTasks.useQuery();
  const { data: assignedTasks, refetch: refetchAssigned } = trpc.tasks.getAssignedToMe.useQuery();
  const { data: createdTasks, refetch: refetchCreated } = trpc.tasks.getCreatedByMe.useQuery();
  const { data: allUsers } = trpc.users.list.useQuery();
  const { data: comments, refetch: refetchComments } = trpc.tasks.getComments.useQuery(
    { taskId: selectedTaskId! },
    { enabled: !!selectedTaskId }
  );

  // Mutations
  const createTask = trpc.tasks.create.useMutation({
    onSuccess: () => {
      toast.success("Aufgabe erstellt");
      setCreateDialogOpen(false);
      resetForm();
      refetchMyTasks();
      refetchAssigned();
      refetchCreated();
    },
    onError: (error) => {
      toast.error("Fehler beim Erstellen: " + error.message);
    },
  });

  const updateTask = trpc.tasks.update.useMutation({
    onSuccess: () => {
      refetchMyTasks();
      refetchAssigned();
      refetchCreated();
    },
    onError: (error) => {
      toast.error("Fehler beim Aktualisieren: " + error.message);
    },
  });

  const deleteTask = trpc.tasks.delete.useMutation({
    onSuccess: () => {
      toast.success("Aufgabe gelöscht");
      refetchMyTasks();
      refetchAssigned();
      refetchCreated();
    },
    onError: (error) => {
      toast.error("Fehler beim Löschen: " + error.message);
    },
  });

  const createComment = trpc.tasks.createComment.useMutation({
    onSuccess: () => {
      toast.success("Kommentar hinzugefügt");
      setNewComment("");
      refetchComments();
    },
    onError: (error) => {
      toast.error("Fehler: " + error.message);
    },
  });

  const deleteComment = trpc.tasks.deleteComment.useMutation({
    onSuccess: () => {
      toast.success("Kommentar gelöscht");
      refetchComments();
    },
    onError: (error) => {
      toast.error("Fehler: " + error.message);
    },
  });

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setPriority("medium");
    setDueDate("");
    setAssignedToId(null);
    setRecurrencePattern("none");
    setRecurrenceEndDate("");
    setReminderDays(0);
  };

  const handleCreate = () => {
    if (!title.trim()) {
      toast.error("Bitte gib einen Titel ein");
      return;
    }
    createTask.mutate({
      title: title.trim(),
      description: description.trim() || undefined,
      priority,
      dueDate: dueDate ? new Date(dueDate) : null,
      assignedToId,
      recurrencePattern,
      recurrenceEndDate: recurrenceEndDate ? new Date(recurrenceEndDate) : null,
      reminderDays: dueDate ? reminderDays : 0, // Nur wenn Fälligkeitsdatum gesetzt
    });
  };

  const handleStatusChange = (id: number, status: "open" | "in_progress" | "completed" | "cancelled") => {
    updateTask.mutate({ id, status });
  };

  const handleDelete = (id: number) => {
    if (confirm("Möchtest du diese Aufgabe wirklich löschen?")) {
      deleteTask.mutate({ id });
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const currentTasks = useMemo((): any[] => {
    let tasks: any[] = [];
    switch (activeTab) {
      case "assigned":
        tasks = (assignedTasks || []) as any[];
        break;
      case "created":
        tasks = (createdTasks || []) as any[];
        break;
      default:
        tasks = (myTasks || []) as any[];
    }

    // Status-Filter
    if (filterStatus === "open") {
      tasks = tasks.filter(t => t.task.status !== "completed" && t.task.status !== "cancelled");
    } else if (filterStatus === "completed") {
      tasks = tasks.filter(t => t.task.status === "completed");
    }

    // Priorität-Filter
    if (filterPriority !== "all") {
      tasks = tasks.filter(t => t.task.priority === filterPriority);
    }

    return tasks;
  }, [activeTab, myTasks, assignedTasks, createdTasks, filterStatus, filterPriority]);

  const openCount = useMemo(() => {
    return (myTasks || []).filter(t => t.task.status !== "completed" && t.task.status !== "cancelled").length;
  }, [myTasks]);

  // Handle /aufgaben/new route
  useEffect(() => {
    if (isNewRoute && !createDialogOpen) {
      setCreateDialogOpen(true);
    }
  }, [isNewRoute, createDialogOpen]);

  // Close dialog and navigate back
  const handleDialogClose = (open: boolean) => {
    setCreateDialogOpen(open);
    if (!open && isNewRoute) {
      setLocation("/aufgaben");
    }
  };

  if (authLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/10">
            <ClipboardCheck className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Aufgaben</h1>
            <p className="text-sm text-muted-foreground">{openCount} offene Aufgaben</p>
          </div>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Neue Aufgabe
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <TabsList>
            <TabsTrigger value="all">Alle</TabsTrigger>
            <TabsTrigger value="assigned">Mir zugewiesen</TabsTrigger>
            <TabsTrigger value="created">Von mir erstellt</TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2">
            <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as any)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Status</SelectItem>
                <SelectItem value="open">Offen</SelectItem>
                <SelectItem value="completed">Erledigt</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterPriority} onValueChange={(v) => setFilterPriority(v as any)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Priorität" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Prioritäten</SelectItem>
                <SelectItem value="low">Niedrig</SelectItem>
                <SelectItem value="medium">Mittel</SelectItem>
                <SelectItem value="high">Hoch</SelectItem>
                <SelectItem value="urgent">Dringend</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <TabsContent value={activeTab} className="mt-4">
          {myTasksLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24 rounded-xl" />
              ))}
            </div>
          ) : (currentTasks?.length ?? 0) === 0 ? (
            <EmptyState
              icon={ClipboardCheck}
              title="Keine Aufgaben"
              description={
                filterStatus === "completed"
                  ? "Du hast noch keine Aufgaben erledigt."
                  : "Du hast keine offenen Aufgaben. Erstelle eine neue Aufgabe!"
              }
              action={
                filterStatus !== "completed"
                  ? {
                      label: "Neue Aufgabe",
                      onClick: () => setCreateDialogOpen(true),
                    }
                  : undefined
              }
            />
          ) : (
            <div className="space-y-3">
              {(currentTasks ?? []).map((task) => (
                <TaskCard
                  key={task.task.id}
                  task={task}
                  onStatusChange={handleStatusChange}
                  onDelete={handleDelete}
                  onComment={(id) => {
                    setSelectedTaskId(id);
                    setCommentDialogOpen(true);
                  }}
                  showAssignee={activeTab !== "assigned"}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Neue Aufgabe</DialogTitle>
            <DialogDescription>
              Erstelle eine neue Aufgabe und weise sie optional einem Teammitglied zu.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Titel *</Label>
              <Input
                id="title"
                placeholder="Was muss erledigt werden?"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Beschreibung</Label>
              <Textarea
                id="description"
                placeholder="Weitere Details zur Aufgabe..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Priorität</Label>
                <Select value={priority} onValueChange={(v) => setPriority(v as any)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Niedrig</SelectItem>
                    <SelectItem value="medium">Mittel</SelectItem>
                    <SelectItem value="high">Hoch</SelectItem>
                    <SelectItem value="urgent">Dringend</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dueDate">Fällig am</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Zuweisen an</Label>
              <Select 
                value={assignedToId?.toString() || "none"} 
                onValueChange={(v) => setAssignedToId(v === "none" ? null : parseInt(v))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Niemand zugewiesen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Niemand zugewiesen</SelectItem>
                  {allUsers?.map((u) => (
                    <SelectItem key={u.id} value={u.id.toString()}>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-5 w-5">
                          <AvatarImage src={u.avatarUrl || undefined} />
                          <AvatarFallback className="text-[10px]">
                            {u.name?.charAt(0) || "?"}
                          </AvatarFallback>
                        </Avatar>
                        {u.name || u.email || "Unbekannt"}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Wiederkehrende Aufgaben */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Repeat className="h-4 w-4" />
                  Wiederholung
                </Label>
                <Select value={recurrencePattern} onValueChange={(v) => setRecurrencePattern(v as any)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Keine Wiederholung</SelectItem>
                    <SelectItem value="daily">Täglich</SelectItem>
                    <SelectItem value="weekly">Wöchentlich</SelectItem>
                    <SelectItem value="monthly">Monatlich</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {recurrencePattern !== "none" && (
                <div className="space-y-2">
                  <Label htmlFor="recurrenceEndDate">Wiederholung bis</Label>
                  <Input
                    id="recurrenceEndDate"
                    type="date"
                    value={recurrenceEndDate}
                    onChange={(e) => setRecurrenceEndDate(e.target.value)}
                  />
                </div>
              )}
            </div>

            {/* Erinnerung */}
            {dueDate && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Erinnerung vor Fälligkeit
                </Label>
                <Select value={String(reminderDays)} onValueChange={(v) => setReminderDays(Number(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Keine Erinnerung</SelectItem>
                    <SelectItem value="1">1 Tag vorher</SelectItem>
                    <SelectItem value="2">2 Tage vorher</SelectItem>
                    <SelectItem value="3">3 Tage vorher</SelectItem>
                    <SelectItem value="7">1 Woche vorher</SelectItem>
                    <SelectItem value="14">2 Wochen vorher</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Du erhältst eine Benachrichtigung und E-Mail vor dem Fälligkeitsdatum.
                </p>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => handleDialogClose(false)}>
              Abbrechen
            </Button>
            <Button onClick={handleCreate} disabled={createTask.isPending}>
              {createTask.isPending ? "Erstelle..." : "Erstellen"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Comment Dialog */}
      <Dialog open={commentDialogOpen} onOpenChange={(open) => {
        setCommentDialogOpen(open);
        if (!open) {
          setSelectedTaskId(null);
          setNewComment("");
        }
      }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Kommentare
            </DialogTitle>
            <DialogDescription>
              Diskutiere diese Aufgabe mit deinem Team.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4 max-h-[400px] overflow-y-auto">
            {comments?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MessageCircle className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p>Noch keine Kommentare</p>
              </div>
            ) : (
              <div className="space-y-3">
                {comments?.map((c) => (
                  <div key={c.comment.id} className="flex gap-3 p-3 rounded-lg bg-muted/50">
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      <AvatarImage src={c.user?.avatarUrl || undefined} />
                      <AvatarFallback className="text-xs">
                        {c.user?.name?.charAt(0) || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-sm">{c.user?.name || "Unbekannt"}</span>
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(c.comment.createdAt), { addSuffix: true, locale: de })}
                          </span>
                          {c.comment.userId === user?.id && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => deleteComment.mutate({ id: c.comment.id })}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                      <p className="text-sm mt-1 whitespace-pre-wrap">{c.comment.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Textarea
              placeholder="Schreibe einen Kommentar..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              rows={2}
              className="flex-1"
            />
            <Button
              onClick={() => {
                if (selectedTaskId && newComment.trim()) {
                  createComment.mutate({ taskId: selectedTaskId, content: newComment.trim() });
                }
              }}
              disabled={!newComment.trim() || createComment.isPending}
              className="self-end"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
