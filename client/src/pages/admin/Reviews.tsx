import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
import { trpc } from "@/lib/trpc";
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  FileText,
  User,
  Calendar,
  MessageSquare,
  Eye,
  Edit,
} from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";

export default function AdminReviews() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const isEditor = user?.role === "editor" || user?.role === "admin";

  const [selectedReview, setSelectedReview] = useState<any>(null);
  const [actionType, setActionType] = useState<"approve" | "reject" | "changes" | null>(null);
  const [reviewMessage, setReviewMessage] = useState("");
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

  const { data: pendingReviews, isLoading } = trpc.reviews.getPending.useQuery();
  const { data: pendingCount } = trpc.reviews.pendingCount.useQuery();
  const utils = trpc.useUtils();

  const approveReview = trpc.reviews.approve.useMutation({
    onSuccess: () => {
      toast.success("Artikel genehmigt und veröffentlicht");
      utils.reviews.getPending.invalidate();
      utils.reviews.pendingCount.invalidate();
      closeDialog();
    },
    onError: (error) => {
      toast.error(`Fehler: ${error.message}`);
    },
  });

  const rejectReview = trpc.reviews.reject.useMutation({
    onSuccess: () => {
      toast.success("Artikel abgelehnt");
      utils.reviews.getPending.invalidate();
      utils.reviews.pendingCount.invalidate();
      closeDialog();
    },
    onError: (error) => {
      toast.error(`Fehler: ${error.message}`);
    },
  });

  const requestChanges = trpc.reviews.requestChanges.useMutation({
    onSuccess: () => {
      toast.success("Änderungen angefordert");
      utils.reviews.getPending.invalidate();
      utils.reviews.pendingCount.invalidate();
      closeDialog();
    },
    onError: (error) => {
      toast.error(`Fehler: ${error.message}`);
    },
  });

  const closeDialog = () => {
    setSelectedReview(null);
    setActionType(null);
    setReviewMessage("");
    setConfirmDialogOpen(false);
  };

  const handleAction = () => {
    if (!selectedReview) return;

    switch (actionType) {
      case "approve":
        approveReview.mutate({
          reviewId: selectedReview.id,
          message: reviewMessage || undefined,
        });
        break;
      case "reject":
        if (!reviewMessage.trim()) {
          toast.error("Bitte geben Sie einen Grund für die Ablehnung an");
          return;
        }
        rejectReview.mutate({
          reviewId: selectedReview.id,
          message: reviewMessage,
        });
        break;
      case "changes":
        if (!reviewMessage.trim()) {
          toast.error("Bitte beschreiben Sie die gewünschten Änderungen");
          return;
        }
        requestChanges.mutate({
          reviewId: selectedReview.id,
          message: reviewMessage,
        });
        break;
    }
  };

  if (!isEditor) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-medium mb-2">Keine Berechtigung</h2>
        <p className="text-muted-foreground">
          Sie haben keine Berechtigung, Reviews zu verwalten.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Review-Warteschlange</h1>
        <p className="text-muted-foreground mt-1">
          Artikel zur Überprüfung und Freigabe
        </p>
      </div>

      {/* Stats */}
      <div className="grid sm:grid-cols-3 gap-4">
        <Card className="card-shadow">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-yellow-100 flex items-center justify-center">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-semibold">{pendingCount || 0}</p>
              <p className="text-sm text-muted-foreground">Ausstehende Reviews</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Review List */}
      {pendingReviews && pendingReviews.length > 0 ? (
        <div className="space-y-4">
          {pendingReviews.map((review: any) => (
            <Card key={review.id} className="card-shadow">
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <FileText className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">Artikel #{review.articleId}</h3>
                        <Badge variant="outline" className="mt-1">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          Wartet auf Review
                        </Badge>
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <User className="h-4 w-4" />
                        <span>Angefragt von User #{review.requestedById}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>
                          {formatDistanceToNow(new Date(review.requestedAt), {
                            addSuffix: true,
                            locale: de,
                          })}
                        </span>
                      </div>
                    </div>

                    {review.requestMessage && (
                      <div className="bg-muted/50 rounded-lg p-3">
                        <div className="flex items-center gap-2 text-sm font-medium mb-1">
                          <MessageSquare className="h-4 w-4" />
                          Nachricht des Autors
                        </div>
                        <p className="text-sm text-muted-foreground">{review.requestMessage}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2 lg:flex-col">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setLocation(`/wiki/article/${review.articleId}`)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Ansehen
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setLocation(`/wiki/edit/${review.articleId}`)}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Bearbeiten
                    </Button>
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => {
                        setSelectedReview(review);
                        setActionType("approve");
                        setConfirmDialogOpen(true);
                      }}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Genehmigen
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-orange-300 text-orange-600 hover:bg-orange-50"
                      onClick={() => {
                        setSelectedReview(review);
                        setActionType("changes");
                        setConfirmDialogOpen(true);
                      }}
                    >
                      <AlertCircle className="h-4 w-4 mr-2" />
                      Änderungen
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-red-300 text-red-600 hover:bg-red-50"
                      onClick={() => {
                        setSelectedReview(review);
                        setActionType("reject");
                        setConfirmDialogOpen(true);
                      }}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Ablehnen
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="card-shadow">
          <CardContent className="p-12 text-center">
            <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-lg font-medium mb-2">Keine ausstehenden Reviews</h3>
            <p className="text-muted-foreground">
              Alle Artikel wurden überprüft. Neue Review-Anfragen erscheinen hier.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Action Dialog */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === "approve" && "Artikel genehmigen"}
              {actionType === "reject" && "Artikel ablehnen"}
              {actionType === "changes" && "Änderungen anfordern"}
            </DialogTitle>
            <DialogDescription>
              {actionType === "approve" &&
                "Der Artikel wird veröffentlicht und für alle Benutzer sichtbar."}
              {actionType === "reject" &&
                "Der Artikel wird abgelehnt und der Autor wird benachrichtigt."}
              {actionType === "changes" &&
                "Der Autor wird aufgefordert, Änderungen vorzunehmen."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="review-message">
                {actionType === "approve" && "Kommentar (optional)"}
                {actionType === "reject" && "Grund für die Ablehnung *"}
                {actionType === "changes" && "Gewünschte Änderungen *"}
              </Label>
              <Textarea
                id="review-message"
                value={reviewMessage}
                onChange={(e) => setReviewMessage(e.target.value)}
                placeholder={
                  actionType === "approve"
                    ? "Optionaler Kommentar für den Autor..."
                    : actionType === "reject"
                    ? "Bitte erklären Sie, warum der Artikel abgelehnt wurde..."
                    : "Beschreiben Sie die gewünschten Änderungen..."
                }
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Abbrechen
            </Button>
            <Button
              onClick={handleAction}
              disabled={
                approveReview.isPending ||
                rejectReview.isPending ||
                requestChanges.isPending
              }
              className={
                actionType === "approve"
                  ? "bg-green-600 hover:bg-green-700"
                  : actionType === "reject"
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-orange-600 hover:bg-orange-700"
              }
            >
              {actionType === "approve" && (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Genehmigen
                </>
              )}
              {actionType === "reject" && (
                <>
                  <XCircle className="h-4 w-4 mr-2" />
                  Ablehnen
                </>
              )}
              {actionType === "changes" && (
                <>
                  <AlertCircle className="h-4 w-4 mr-2" />
                  Änderungen anfordern
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
