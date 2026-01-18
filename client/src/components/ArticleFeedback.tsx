import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import {
  ThumbsUp,
  ThumbsDown,
  AlertCircle,
  MessageSquare,
  Check,
  Loader2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface ArticleFeedbackProps {
  articleId: number;
  articleTitle: string;
}

type Rating = "helpful" | "not_helpful" | "needs_improvement";
type FeedbackType = "content" | "accuracy" | "clarity" | "completeness" | "other";

const feedbackTypeLabels: Record<FeedbackType, string> = {
  content: "Inhalt",
  accuracy: "Genauigkeit",
  clarity: "Verständlichkeit",
  completeness: "Vollständigkeit",
  other: "Sonstiges",
};

export default function ArticleFeedback({ articleId, articleTitle }: ArticleFeedbackProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [selectedRating, setSelectedRating] = useState<Rating | null>(null);
  const [feedbackType, setFeedbackType] = useState<FeedbackType>("content");
  const [comment, setComment] = useState("");

  const utils = trpc.useUtils();

  const { data: existingFeedback, isLoading: loadingExisting } =
    trpc.feedback.getUserFeedback.useQuery({ articleId });

  const { data: stats } = trpc.feedback.getStats.useQuery({ articleId });

  const submitFeedback = trpc.feedback.submit.useMutation({
    onSuccess: (result) => {
      toast.success(
        result.updated
          ? "Feedback aktualisiert"
          : "Vielen Dank für Ihr Feedback!"
      );
      setShowDialog(false);
      setSelectedRating(null);
      setComment("");
      utils.feedback.getUserFeedback.invalidate({ articleId });
      utils.feedback.getStats.invalidate({ articleId });
    },
    onError: (error) => {
      toast.error(error.message || "Fehler beim Senden des Feedbacks");
    },
  });

  const handleQuickRating = (rating: Rating) => {
    if (rating === "helpful") {
      // Quick submit for helpful
      submitFeedback.mutate({
        articleId,
        rating: "helpful",
        feedbackType: "content",
      });
    } else {
      // Open dialog for detailed feedback
      setSelectedRating(rating);
      setShowDialog(true);
    }
  };

  const handleSubmitDetailed = () => {
    if (!selectedRating) {
      toast.error("Bitte wählen Sie eine Bewertung");
      return;
    }

    submitFeedback.mutate({
      articleId,
      rating: selectedRating,
      feedbackType,
      comment: comment.trim() || undefined,
    });
  };

  const isSubmitting = submitFeedback.isPending;

  return (
    <Card className="card-shadow">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          War dieser Artikel hilfreich?
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loadingExisting ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Laden...
          </div>
        ) : existingFeedback ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <Check className="h-4 w-4 text-green-600" />
              <span className="text-muted-foreground">
                Sie haben bereits Feedback gegeben
              </span>
            </div>
            <div className="flex items-center gap-2">
              {existingFeedback.rating === "helpful" && (
                <span className="inline-flex items-center gap-1 text-sm text-green-600">
                  <ThumbsUp className="h-4 w-4" />
                  Hilfreich
                </span>
              )}
              {existingFeedback.rating === "not_helpful" && (
                <span className="inline-flex items-center gap-1 text-sm text-red-600">
                  <ThumbsDown className="h-4 w-4" />
                  Nicht hilfreich
                </span>
              )}
              {existingFeedback.rating === "needs_improvement" && (
                <span className="inline-flex items-center gap-1 text-sm text-amber-600">
                  <AlertCircle className="h-4 w-4" />
                  Verbesserung nötig
                </span>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedRating(existingFeedback.rating);
                setFeedbackType(existingFeedback.feedbackType);
                setComment(existingFeedback.comment || "");
                setShowDialog(true);
              }}
            >
              Feedback ändern
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Quick rating buttons */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickRating("helpful")}
                disabled={isSubmitting}
                className="gap-2"
              >
                <ThumbsUp className="h-4 w-4" />
                Ja
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickRating("not_helpful")}
                disabled={isSubmitting}
                className="gap-2"
              >
                <ThumbsDown className="h-4 w-4" />
                Nein
              </Button>
              <Dialog open={showDialog} onOpenChange={setShowDialog}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedRating("needs_improvement")}
                    disabled={isSubmitting}
                    className="gap-2"
                  >
                    <AlertCircle className="h-4 w-4" />
                    Verbesserung vorschlagen
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Feedback geben</DialogTitle>
                    <DialogDescription>
                      Helfen Sie uns, "{articleTitle}" zu verbessern
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4 py-4">
                    {/* Rating selection */}
                    <div>
                      <Label className="mb-2 block">Bewertung</Label>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant={selectedRating === "helpful" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setSelectedRating("helpful")}
                          className="gap-2"
                        >
                          <ThumbsUp className="h-4 w-4" />
                          Hilfreich
                        </Button>
                        <Button
                          type="button"
                          variant={selectedRating === "not_helpful" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setSelectedRating("not_helpful")}
                          className="gap-2"
                        >
                          <ThumbsDown className="h-4 w-4" />
                          Nicht hilfreich
                        </Button>
                        <Button
                          type="button"
                          variant={selectedRating === "needs_improvement" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setSelectedRating("needs_improvement")}
                          className="gap-2"
                        >
                          <AlertCircle className="h-4 w-4" />
                          Verbesserung nötig
                        </Button>
                      </div>
                    </div>

                    {/* Feedback type */}
                    <div>
                      <Label htmlFor="feedbackType">Bereich</Label>
                      <Select
                        value={feedbackType}
                        onValueChange={(v) => setFeedbackType(v as FeedbackType)}
                      >
                        <SelectTrigger className="mt-1.5">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(feedbackTypeLabels).map(([key, label]) => (
                            <SelectItem key={key} value={key}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Comment */}
                    <div>
                      <Label htmlFor="comment">Kommentar (optional)</Label>
                      <Textarea
                        id="comment"
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder="Was können wir verbessern?"
                        rows={4}
                        className="mt-1.5"
                      />
                    </div>
                  </div>

                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowDialog(false)}>
                      Abbrechen
                    </Button>
                    <Button onClick={handleSubmitDetailed} disabled={isSubmitting}>
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Senden...
                        </>
                      ) : (
                        "Feedback senden"
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            {/* Stats */}
            {stats && stats.total > 0 && (
              <div className="text-xs text-muted-foreground pt-2 border-t">
                {stats.helpful} von {stats.total} Benutzer{stats.total !== 1 ? "n" : ""} fanden
                diesen Artikel hilfreich
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
