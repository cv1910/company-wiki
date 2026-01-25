import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { trpc } from "@/lib/trpc";
import { toast } from "@/lib/hapticToast";
import { Mail, Bell, Calendar, FileText, MessageSquare, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";

export default function EmailSettings() {
  const { user, loading: authLoading } = useAuth();
  const { data: settings, isLoading } = trpc.emailSettings.get.useQuery(undefined, {
    enabled: !!user,
  });
  const updateSettings = trpc.emailSettings.update.useMutation();

  const [localSettings, setLocalSettings] = useState({
    leaveRequestSubmitted: true,
    leaveRequestApproved: true,
    leaveRequestRejected: true,
    articleReviewRequested: true,
    articleApproved: true,
    articleRejected: true,
    articleFeedback: true,
    mentioned: true,
    dailyDigest: false,
    weeklyDigest: true,
  });

  useEffect(() => {
    if (settings) {
      setLocalSettings({
        leaveRequestSubmitted: settings.leaveRequestSubmitted,
        leaveRequestApproved: settings.leaveRequestApproved,
        leaveRequestRejected: settings.leaveRequestRejected,
        articleReviewRequested: settings.articleReviewRequested,
        articleApproved: settings.articleApproved,
        articleRejected: settings.articleRejected,
        articleFeedback: settings.articleFeedback,
        mentioned: settings.mentioned,
        dailyDigest: settings.dailyDigest,
        weeklyDigest: settings.weeklyDigest,
      });
    }
  }, [settings]);

  const handleToggle = async (key: keyof typeof localSettings) => {
    const newValue = !localSettings[key];
    setLocalSettings((prev) => ({ ...prev, [key]: newValue }));

    try {
      await updateSettings.mutateAsync({ [key]: newValue });
      toast.success("Einstellung gespeichert");
    } catch {
      // Revert on error
      setLocalSettings((prev) => ({ ...prev, [key]: !newValue }));
      toast.error("Fehler beim Speichern");
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
      <div className="max-w-3xl mx-auto space-y-8 p-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">E-Mail-Benachrichtigungen</h1>
          <p className="text-muted-foreground mt-2">
            Verwalten Sie, welche E-Mail-Benachrichtigungen Sie erhalten möchten.
          </p>
        </div>

        {/* Urlaub */}
        <Card className="glass-card">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-blue-500/10">
                <Calendar className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <CardTitle className="text-lg">Urlaubsanträge</CardTitle>
                <CardDescription>Benachrichtigungen zu Urlaubsanträgen</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="leaveSubmitted" className="flex-1">
                <span className="font-medium">Neue Anträge</span>
                <p className="text-sm text-muted-foreground">
                  Benachrichtigung wenn ein neuer Urlaubsantrag eingereicht wird (nur Admins)
                </p>
              </Label>
              <Switch
                id="leaveSubmitted"
                checked={localSettings.leaveRequestSubmitted}
                onCheckedChange={() => handleToggle("leaveRequestSubmitted")}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <Label htmlFor="leaveApproved" className="flex-1">
                <span className="font-medium">Antrag genehmigt</span>
                <p className="text-sm text-muted-foreground">
                  Benachrichtigung wenn Ihr Urlaubsantrag genehmigt wurde
                </p>
              </Label>
              <Switch
                id="leaveApproved"
                checked={localSettings.leaveRequestApproved}
                onCheckedChange={() => handleToggle("leaveRequestApproved")}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <Label htmlFor="leaveRejected" className="flex-1">
                <span className="font-medium">Antrag abgelehnt</span>
                <p className="text-sm text-muted-foreground">
                  Benachrichtigung wenn Ihr Urlaubsantrag abgelehnt wurde
                </p>
              </Label>
              <Switch
                id="leaveRejected"
                checked={localSettings.leaveRequestRejected}
                onCheckedChange={() => handleToggle("leaveRequestRejected")}
              />
            </div>
          </CardContent>
        </Card>

        {/* Artikel */}
        <Card className="glass-card">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-green-500/10">
                <FileText className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <CardTitle className="text-lg">Wiki-Artikel</CardTitle>
                <CardDescription>Benachrichtigungen zu Artikeln und Reviews</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="reviewRequested" className="flex-1">
                <span className="font-medium">Review-Anfragen</span>
                <p className="text-sm text-muted-foreground">
                  Benachrichtigung wenn Sie um ein Review gebeten werden
                </p>
              </Label>
              <Switch
                id="reviewRequested"
                checked={localSettings.articleReviewRequested}
                onCheckedChange={() => handleToggle("articleReviewRequested")}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <Label htmlFor="articleApproved" className="flex-1">
                <span className="font-medium">Artikel genehmigt</span>
                <p className="text-sm text-muted-foreground">
                  Benachrichtigung wenn Ihr Artikel genehmigt wurde
                </p>
              </Label>
              <Switch
                id="articleApproved"
                checked={localSettings.articleApproved}
                onCheckedChange={() => handleToggle("articleApproved")}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <Label htmlFor="articleRejected" className="flex-1">
                <span className="font-medium">Artikel abgelehnt</span>
                <p className="text-sm text-muted-foreground">
                  Benachrichtigung wenn Ihr Artikel abgelehnt wurde
                </p>
              </Label>
              <Switch
                id="articleRejected"
                checked={localSettings.articleRejected}
                onCheckedChange={() => handleToggle("articleRejected")}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <Label htmlFor="articleFeedback" className="flex-1">
                <span className="font-medium">Neues Feedback</span>
                <p className="text-sm text-muted-foreground">
                  Benachrichtigung wenn jemand Feedback zu Ihrem Artikel gibt
                </p>
              </Label>
              <Switch
                id="articleFeedback"
                checked={localSettings.articleFeedback}
                onCheckedChange={() => handleToggle("articleFeedback")}
              />
            </div>
          </CardContent>
        </Card>

        {/* Erwähnungen */}
        <Card className="glass-card">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-purple-500/10">
                <MessageSquare className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <CardTitle className="text-lg">Erwähnungen</CardTitle>
                <CardDescription>Benachrichtigungen wenn Sie erwähnt werden</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <Label htmlFor="mentioned" className="flex-1">
                <span className="font-medium">@Erwähnungen</span>
                <p className="text-sm text-muted-foreground">
                  Benachrichtigung wenn jemand Sie in einem Artikel oder Kommentar erwähnt
                </p>
              </Label>
              <Switch
                id="mentioned"
                checked={localSettings.mentioned}
                onCheckedChange={() => handleToggle("mentioned")}
              />
            </div>
          </CardContent>
        </Card>

        {/* Digest */}
        <Card className="glass-card">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-orange-500/10">
                <Mail className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <CardTitle className="text-lg">Zusammenfassungen</CardTitle>
                <CardDescription>Regelmäßige Übersichten per E-Mail</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="dailyDigest" className="flex-1">
                <span className="font-medium">Tägliche Zusammenfassung</span>
                <p className="text-sm text-muted-foreground">
                  Tägliche E-Mail mit allen Aktivitäten
                </p>
              </Label>
              <Switch
                id="dailyDigest"
                checked={localSettings.dailyDigest}
                onCheckedChange={() => handleToggle("dailyDigest")}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <Label htmlFor="weeklyDigest" className="flex-1">
                <span className="font-medium">Wöchentliche Zusammenfassung</span>
                <p className="text-sm text-muted-foreground">
                  Wöchentliche E-Mail mit allen Aktivitäten
                </p>
              </Label>
              <Switch
                id="weeklyDigest"
                checked={localSettings.weeklyDigest}
                onCheckedChange={() => handleToggle("weeklyDigest")}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
