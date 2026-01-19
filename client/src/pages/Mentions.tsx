import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { AtSign, FileText, MessageSquare, BookOpen, Check, CheckCheck, Loader2 } from "lucide-react";
import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";

export default function Mentions() {
  const { user, loading: authLoading } = useAuth();
  const utils = trpc.useUtils();
  
  const { data: mentions = [], isLoading } = trpc.mentions.list.useQuery(
    { limit: 50 },
    { enabled: !!user }
  );
  
  const markRead = trpc.mentions.markRead.useMutation({
    onSuccess: () => {
      utils.mentions.list.invalidate();
      utils.mentions.unreadCount.invalidate();
    },
  });
  
  const markAllRead = trpc.mentions.markAllRead.useMutation({
    onSuccess: () => {
      utils.mentions.list.invalidate();
      utils.mentions.unreadCount.invalidate();
      toast.success("Alle Erwähnungen als gelesen markiert");
    },
  });

  const unreadCount = mentions.filter((m) => !m.isRead).length;

  const getContextIcon = (type: string) => {
    switch (type) {
      case "article":
        return <FileText className="h-4 w-4" />;
      case "comment":
        return <MessageSquare className="h-4 w-4" />;
      case "sop":
        return <BookOpen className="h-4 w-4" />;
      default:
        return <AtSign className="h-4 w-4" />;
    }
  };

  const getContextLink = (type: string, id: number) => {
    switch (type) {
      case "article":
        return `/wiki/article/${id}`;
      case "sop":
        return `/sops/${id}`;
      default:
        return "#";
    }
  };

  const getContextLabel = (type: string) => {
    switch (type) {
      case "article":
        return "Artikel";
      case "comment":
        return "Kommentar";
      case "sop":
        return "SOP";
      default:
        return "Inhalt";
    }
  };

  if (authLoading || isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight flex items-center gap-3">
              <AtSign className="h-8 w-8 text-primary" />
              Erwähnungen
            </h1>
            <p className="text-muted-foreground mt-2">
              Hier sehen Sie alle Stellen, an denen Sie erwähnt wurden.
            </p>
          </div>
          {unreadCount > 0 && (
            <Button
              variant="outline"
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending}
              className="gap-2"
            >
              <CheckCheck className="h-4 w-4" />
              Alle als gelesen markieren
            </Button>
          )}
        </div>

        {/* Stats */}
        {unreadCount > 0 && (
          <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
            <p className="text-sm">
              <span className="font-semibold text-primary">{unreadCount}</span> ungelesene Erwähnung{unreadCount !== 1 ? "en" : ""}
            </p>
          </div>
        )}

        {/* Mentions List */}
        <div className="space-y-3">
          {mentions.length === 0 ? (
            <Card className="glass-card">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <div className="p-4 rounded-full bg-muted/50 mb-4">
                  <AtSign className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="font-medium text-lg">Keine Erwähnungen</h3>
                <p className="text-muted-foreground mt-1">
                  Sie wurden noch nicht in Artikeln oder Kommentaren erwähnt.
                </p>
              </CardContent>
            </Card>
          ) : (
            mentions.map((mention) => (
              <Card
                key={mention.id}
                className={`glass-card transition-all duration-200 hover:shadow-md ${
                  !mention.isRead ? "border-primary/30 bg-primary/5" : ""
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div
                      className={`p-2 rounded-xl ${
                        !mention.isRead ? "bg-primary/10" : "bg-muted/50"
                      }`}
                    >
                      {getContextIcon(mention.contextType)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-muted">
                          {getContextLabel(mention.contextType)}
                        </span>
                        {!mention.isRead && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary">
                            Neu
                          </span>
                        )}
                      </div>
                      <Link href={getContextLink(mention.contextType, mention.contextId)}>
                        <h3 className="font-medium mt-1 hover:text-primary transition-colors cursor-pointer">
                          {mention.contextTitle || "Unbenannter Inhalt"}
                        </h3>
                      </Link>
                      <p className="text-sm text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(mention.createdAt), {
                          addSuffix: true,
                          locale: de,
                        })}
                      </p>
                    </div>
                    {!mention.isRead && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => markRead.mutate({ id: mention.id })}
                        disabled={markRead.isPending}
                        className="shrink-0"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
