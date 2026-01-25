import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import {
  AlertCircle,
  CheckCircle,
  Clock,
  FileText,
  MessageSquare,
  ThumbsDown,
  ThumbsUp,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "@/lib/hapticToast";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";

type FeedbackStatus = "pending" | "reviewed" | "resolved" | "dismissed";

const statusConfig: Record<FeedbackStatus, { label: string; icon: React.ReactNode; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  pending: { label: "Ausstehend", icon: <Clock className="h-3 w-3" />, variant: "secondary" },
  reviewed: { label: "Geprüft", icon: <CheckCircle className="h-3 w-3" />, variant: "default" },
  resolved: { label: "Erledigt", icon: <CheckCircle className="h-3 w-3" />, variant: "outline" },
  dismissed: { label: "Abgelehnt", icon: <XCircle className="h-3 w-3" />, variant: "destructive" },
};

const feedbackTypeLabels: Record<string, string> = {
  content: "Inhalt",
  accuracy: "Genauigkeit",
  clarity: "Verständlichkeit",
  completeness: "Vollständigkeit",
  other: "Sonstiges",
};

export default function AdminFeedback() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<FeedbackStatus | "all">("pending");
  const [selectedFeedback, setSelectedFeedback] = useState<any>(null);
  const [newStatus, setNewStatus] = useState<FeedbackStatus>("reviewed");
  const [adminResponse, setAdminResponse] = useState("");

  const utils = trpc.useUtils();

  const isEditor = user?.role === "editor" || user?.role === "admin";

  const { data: feedback, isLoading } = trpc.feedback.list.useQuery(
    { status: activeTab === "all" ? undefined : activeTab },
    { enabled: isEditor }
  );

  const { data: pendingCount } = trpc.feedback.pendingCount.useQuery(undefined, {
    enabled: isEditor,
  });

  const updateStatus = trpc.feedback.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("Feedback aktualisiert");
      setSelectedFeedback(null);
      setAdminResponse("");
      utils.feedback.list.invalidate();
      utils.feedback.pendingCount.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  if (!isEditor) {
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

  const handleUpdateStatus = () => {
    if (!selectedFeedback) return;
    updateStatus.mutate({
      id: selectedFeedback.id,
      status: newStatus,
      adminResponse: adminResponse.trim() || undefined,
    });
  };

  const getRatingIcon = (rating: string) => {
    switch (rating) {
      case "helpful":
        return <ThumbsUp className="h-4 w-4 text-green-600" />;
      case "not_helpful":
        return <ThumbsDown className="h-4 w-4 text-red-600" />;
      case "needs_improvement":
        return <AlertCircle className="h-4 w-4 text-amber-600" />;
      default:
        return null;
    }
  };

  const getRatingLabel = (rating: string) => {
    switch (rating) {
      case "helpful":
        return "Hilfreich";
      case "not_helpful":
        return "Nicht hilfreich";
      case "needs_improvement":
        return "Verbesserung nötig";
      default:
        return rating;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Feedback-Übersicht</h1>
        <p className="text-muted-foreground mt-1">
          Verwalten Sie Benutzer-Feedback zu Wiki-Artikeln
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="card-shadow">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-semibold">{pendingCount || 0}</p>
                <p className="text-sm text-muted-foreground">Ausstehend</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-shadow">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <ThumbsUp className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-semibold">
                  {feedback?.filter((f) => f.rating === "helpful").length || 0}
                </p>
                <p className="text-sm text-muted-foreground">Hilfreich</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-shadow">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/10">
                <ThumbsDown className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-semibold">
                  {feedback?.filter((f) => f.rating === "not_helpful").length || 0}
                </p>
                <p className="text-sm text-muted-foreground">Nicht hilfreich</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-shadow">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <MessageSquare className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-semibold">{feedback?.length || 0}</p>
                <p className="text-sm text-muted-foreground">Gesamt</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as FeedbackStatus | "all")}>
        <TabsList>
          <TabsTrigger value="all">Alle</TabsTrigger>
          <TabsTrigger value="pending" className="gap-2">
            Ausstehend
            {pendingCount && pendingCount > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                {pendingCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="reviewed">Geprüft</TabsTrigger>
          <TabsTrigger value="resolved">Erledigt</TabsTrigger>
          <TabsTrigger value="dismissed">Abgelehnt</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24 rounded-xl" />
              ))}
            </div>
          ) : feedback && feedback.length > 0 ? (
            <div className="space-y-3">
              {feedback.map((item) => (
                <Card
                  key={item.id}
                  className="card-shadow cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => {
                    setSelectedFeedback(item);
                    setNewStatus(item.status);
                    setAdminResponse(item.adminResponse || "");
                  }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-muted">
                          {getRatingIcon(item.rating)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">{getRatingLabel(item.rating)}</span>
                            <Badge variant={statusConfig[item.status as FeedbackStatus].variant}>
                              {statusConfig[item.status as FeedbackStatus].icon}
                              <span className="ml-1">
                                {statusConfig[item.status as FeedbackStatus].label}
                              </span>
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Bereich: {feedbackTypeLabels[item.feedbackType] || item.feedbackType}
                          </p>
                          {item.comment && (
                            <p className="text-sm mt-2 line-clamp-2">{item.comment}</p>
                          )}
                          <p className="text-xs text-muted-foreground mt-2">
                            {formatDistanceToNow(new Date(item.createdAt), {
                              addSuffix: true,
                              locale: de,
                            })}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          // Navigate to article - we'd need the slug
                          toast.info("Artikel wird geladen...");
                        }}
                      >
                        <FileText className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="card-shadow">
              <CardContent className="p-8 text-center">
                <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Kein Feedback in dieser Kategorie</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Feedback Detail Dialog */}
      <Dialog open={!!selectedFeedback} onOpenChange={() => setSelectedFeedback(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Feedback bearbeiten</DialogTitle>
            <DialogDescription>
              Bearbeiten Sie den Status und fügen Sie eine Antwort hinzu
            </DialogDescription>
          </DialogHeader>

          {selectedFeedback && (
            <div className="space-y-4 py-4">
              {/* Feedback Info */}
              <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                <div className="flex items-center gap-2">
                  {getRatingIcon(selectedFeedback.rating)}
                  <span className="font-medium">{getRatingLabel(selectedFeedback.rating)}</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Bereich: {feedbackTypeLabels[selectedFeedback.feedbackType]}
                </p>
                {selectedFeedback.comment && (
                  <p className="text-sm mt-2">{selectedFeedback.comment}</p>
                )}
              </div>

              {/* Status */}
              <div>
                <label className="text-sm font-medium">Status</label>
                <Select value={newStatus} onValueChange={(v) => setNewStatus(v as FeedbackStatus)}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Ausstehend</SelectItem>
                    <SelectItem value="reviewed">Geprüft</SelectItem>
                    <SelectItem value="resolved">Erledigt</SelectItem>
                    <SelectItem value="dismissed">Abgelehnt</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Admin Response */}
              <div>
                <label className="text-sm font-medium">Antwort (optional)</label>
                <Textarea
                  value={adminResponse}
                  onChange={(e) => setAdminResponse(e.target.value)}
                  placeholder="Fügen Sie eine Antwort für den Benutzer hinzu..."
                  rows={3}
                  className="mt-1.5"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedFeedback(null)}>
              Abbrechen
            </Button>
            <Button onClick={handleUpdateStatus} disabled={updateStatus.isPending}>
              {updateStatus.isPending ? "Speichern..." : "Speichern"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
