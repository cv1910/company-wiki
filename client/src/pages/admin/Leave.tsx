import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, CheckCircle, XCircle, Clock, AlertCircle, Loader2, Users } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { de } from "date-fns/locale";

const leaveTypes = [
  { value: "vacation", label: "Urlaub", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
  { value: "sick", label: "Krankheit", color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" },
  { value: "personal", label: "Persönlich", color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200" },
  { value: "parental", label: "Elternzeit", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
  { value: "other", label: "Sonstiges", color: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200" },
];

const statusConfig = {
  pending: { label: "Ausstehend", icon: Clock, color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" },
  approved: { label: "Genehmigt", icon: CheckCircle, color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
  rejected: { label: "Abgelehnt", icon: XCircle, color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" },
  cancelled: { label: "Storniert", icon: AlertCircle, color: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200" },
};

export default function AdminLeave() {
  const { user, loading: authLoading } = useAuth();
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [comment, setComment] = useState("");
  const [actionType, setActionType] = useState<"approve" | "reject" | null>(null);
  const [statusFilter, setStatusFilter] = useState("pending");

  const utils = trpc.useUtils();
  const { data: pendingRequests, isLoading: pendingLoading } = trpc.leave.pending.useQuery();
  const { data: allRequests, isLoading: allLoading } = trpc.leave.all.useQuery(
    statusFilter !== "all" ? { status: statusFilter } : undefined
  );

  const approveRequest = trpc.leave.approve.useMutation({
    onSuccess: () => {
      toast.success("Antrag genehmigt");
      setSelectedRequest(null);
      setComment("");
      setActionType(null);
      utils.leave.pending.invalidate();
      utils.leave.all.invalidate();
    },
    onError: (error) => {
      toast.error("Fehler: " + error.message);
    },
  });

  const rejectRequest = trpc.leave.reject.useMutation({
    onSuccess: () => {
      toast.success("Antrag abgelehnt");
      setSelectedRequest(null);
      setComment("");
      setActionType(null);
      utils.leave.pending.invalidate();
      utils.leave.all.invalidate();
    },
    onError: (error) => {
      toast.error("Fehler: " + error.message);
    },
  });

  const handleAction = () => {
    if (!selectedRequest || !actionType) return;
    
    if (actionType === "approve") {
      approveRequest.mutate({ id: selectedRequest.request.id, comment: comment || undefined });
    } else {
      rejectRequest.mutate({ id: selectedRequest.request.id, comment: comment || undefined });
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || user.role !== "admin") {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Nur Administratoren haben Zugriff auf diese Seite.</p>
      </div>
    );
  }

  const RequestCard = ({ item, showActions = false }: { item: any; showActions?: boolean }) => {
    const leaveType = leaveTypes.find((t) => t.value === item.request.leaveType);
    const status = statusConfig[item.request.status as keyof typeof statusConfig];
    const StatusIcon = status.icon;

    return (
      <div className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
        <div className="flex items-center gap-4">
          <Avatar className="h-10 w-10">
            <AvatarImage src={item.user?.avatarUrl || undefined} />
            <AvatarFallback>
              {item.user?.name?.charAt(0) || item.user?.email?.charAt(0) || "?"}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium">{item.user?.name || item.user?.email || "Unbekannt"}</span>
              <Badge className={leaveType?.color}>{leaveType?.label}</Badge>
              <Badge variant="outline" className={status.color}>
                <StatusIcon className="w-3 h-3 mr-1" />
                {status.label}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {format(new Date(item.request.startDate), "dd. MMM yyyy", { locale: de })} -{" "}
              {format(new Date(item.request.endDate), "dd. MMM yyyy", { locale: de })}
              <span className="mx-2">•</span>
              {item.request.totalDays} {item.request.totalDays === 1 ? "Tag" : "Tage"}
            </p>
            {item.request.reason && (
              <p className="text-xs text-muted-foreground mt-1">{item.request.reason}</p>
            )}
          </div>
        </div>
        {showActions && item.request.status === "pending" && (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="text-green-600 hover:text-green-700 hover:bg-green-50"
              onClick={() => {
                setSelectedRequest(item);
                setActionType("approve");
              }}
            >
              <CheckCircle className="w-4 h-4 mr-1" />
              Genehmigen
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={() => {
                setSelectedRequest(item);
                setActionType("reject");
              }}
            >
              <XCircle className="w-4 h-4 mr-1" />
              Ablehnen
            </Button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 page-transition">
      <div>
        <h1 className="text-2xl font-semibold">Urlaubsverwaltung</h1>
        <p className="text-muted-foreground mt-1">
          Verwalten Sie Urlaubsanträge der Mitarbeiter
        </p>
      </div>

      {/* Pending Requests */}
      <Card className="card-shadow">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-yellow-600" />
                Ausstehende Anträge
              </CardTitle>
              <CardDescription>
                {pendingRequests?.length || 0} Anträge warten auf Ihre Entscheidung
              </CardDescription>
            </div>
            {pendingRequests && pendingRequests.length > 0 && (
              <Badge variant="secondary" className="text-lg px-3 py-1">
                {pendingRequests.length}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {pendingLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="h-20 bg-muted rounded-lg skeleton-shimmer" />
              ))}
            </div>
          ) : !pendingRequests || pendingRequests.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="w-12 h-12 mx-auto text-green-500/50 mb-4" />
              <p className="text-muted-foreground">Keine ausstehenden Anträge</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingRequests.map((item, index) => (
                <div key={item.request.id} className="animate-fade-in" style={{ animationDelay: `${index * 50}ms` }}>
                  <RequestCard item={item} showActions />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* All Requests */}
      <Card className="card-shadow">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Alle Anträge
          </CardTitle>
          <CardDescription>Übersicht aller Urlaubsanträge</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={statusFilter} onValueChange={setStatusFilter} className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="pending">Ausstehend</TabsTrigger>
              <TabsTrigger value="approved">Genehmigt</TabsTrigger>
              <TabsTrigger value="rejected">Abgelehnt</TabsTrigger>
              <TabsTrigger value="all">Alle</TabsTrigger>
            </TabsList>
            <TabsContent value={statusFilter}>
              {allLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-20 bg-muted rounded-lg skeleton-shimmer" />
                  ))}
                </div>
              ) : !allRequests || allRequests.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">Keine Anträge gefunden</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {allRequests.map((item, index) => (
                    <div key={item.request.id} className="animate-fade-in" style={{ animationDelay: `${index * 30}ms` }}>
                      <RequestCard item={item} showActions={statusFilter === "pending"} />
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Action Dialog */}
      <Dialog open={!!selectedRequest && !!actionType} onOpenChange={() => {
        setSelectedRequest(null);
        setActionType(null);
        setComment("");
      }}>
        <DialogContent className="animate-scale-in">
          <DialogHeader>
            <DialogTitle>
              {actionType === "approve" ? "Antrag genehmigen" : "Antrag ablehnen"}
            </DialogTitle>
            <DialogDescription>
              {actionType === "approve"
                ? "Möchten Sie diesen Urlaubsantrag genehmigen?"
                : "Möchten Sie diesen Urlaubsantrag ablehnen?"}
            </DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="py-4">
              <div className="p-4 rounded-lg bg-muted">
                <p className="font-medium">{selectedRequest.user?.name || selectedRequest.user?.email}</p>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(selectedRequest.request.startDate), "dd. MMM yyyy", { locale: de })} -{" "}
                  {format(new Date(selectedRequest.request.endDate), "dd. MMM yyyy", { locale: de })}
                </p>
                <p className="text-sm text-muted-foreground">
                  {selectedRequest.request.totalDays} {selectedRequest.request.totalDays === 1 ? "Tag" : "Tage"}
                </p>
              </div>
              <div className="mt-4">
                <label className="text-sm font-medium">Kommentar (optional)</label>
                <Textarea
                  placeholder={actionType === "approve" ? "Gute Erholung!" : "Grund für die Ablehnung..."}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="mt-2"
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setSelectedRequest(null);
              setActionType(null);
              setComment("");
            }}>
              Abbrechen
            </Button>
            <Button
              onClick={handleAction}
              disabled={approveRequest.isPending || rejectRequest.isPending}
              variant={actionType === "approve" ? "default" : "destructive"}
            >
              {(approveRequest.isPending || rejectRequest.isPending) && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              {actionType === "approve" ? "Genehmigen" : "Ablehnen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
