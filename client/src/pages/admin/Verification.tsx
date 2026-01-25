import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { toast } from "@/lib/hapticToast";
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertTriangle,
  Shield,
  ShieldCheck,
  ShieldAlert,
  ExternalLink,
  Calendar
} from "lucide-react";

export default function Verification() {
  const [verifyDialogOpen, setVerifyDialogOpen] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<{ id: number; title: string } | null>(null);
  const [expiresAt, setExpiresAt] = useState("");
  const [notes, setNotes] = useState("");
  
  const utils = trpc.useUtils();
  
  const { data: overview, isLoading: overviewLoading } = trpc.verification.overview.useQuery();
  const { data: allArticles, isLoading: articlesLoading } = trpc.verification.list.useQuery();
  const { data: expiredArticles } = trpc.verification.list.useQuery({ isExpired: true });
  const { data: expiringSoonArticles } = trpc.verification.list.useQuery({ expiringSoon: true });
  
  const verifyMutation = trpc.verification.verify.useMutation({
    onSuccess: () => {
      toast.success("Artikel als verifiziert markiert");
      utils.verification.invalidate();
      setVerifyDialogOpen(false);
      setSelectedArticle(null);
      setExpiresAt("");
      setNotes("");
    },
    onError: (error) => {
      toast.error(`Fehler: ${error.message}`);
    },
  });
  
  const unverifyMutation = trpc.verification.unverify.useMutation({
    onSuccess: () => {
      toast.success("Verifizierung entfernt");
      utils.verification.invalidate();
    },
    onError: (error) => {
      toast.error(`Fehler: ${error.message}`);
    },
  });

  const handleVerify = () => {
    if (!selectedArticle) return;
    verifyMutation.mutate({
      articleId: selectedArticle.id,
      expiresAt: expiresAt || undefined,
      notes: notes || undefined,
    });
  };

  const openVerifyDialog = (article: { id: number; title: string }) => {
    setSelectedArticle(article);
    // Default: expires in 6 months
    const defaultExpiry = new Date();
    defaultExpiry.setMonth(defaultExpiry.getMonth() + 6);
    setExpiresAt(defaultExpiry.toISOString().split("T")[0]);
    setVerifyDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Inhaltsverifizierung</h1>
        <p className="text-muted-foreground">
          Verwalten Sie die Aktualität und Richtigkeit Ihrer Wiki-Artikel
        </p>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Verifiziert</CardTitle>
            <ShieldCheck className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            {overviewLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold text-green-600">{overview?.verified || 0}</div>
            )}
            <p className="text-xs text-muted-foreground">Geprüfte Artikel</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Nicht verifiziert</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {overviewLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{overview?.unverified || 0}</div>
            )}
            <p className="text-xs text-muted-foreground">Noch nicht geprüft</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Abgelaufen</CardTitle>
            <ShieldAlert className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            {overviewLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold text-red-600">{overview?.expired || 0}</div>
            )}
            <p className="text-xs text-muted-foreground">Erneute Prüfung nötig</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Läuft bald ab</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            {overviewLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold text-yellow-600">{overview?.expiringSoon || 0}</div>
            )}
            <p className="text-xs text-muted-foreground">Innerhalb 7 Tagen</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">Alle Artikel</TabsTrigger>
          <TabsTrigger value="expired" className="gap-2">
            <AlertTriangle className="h-4 w-4" />
            Abgelaufen ({expiredArticles?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="expiring" className="gap-2">
            <Clock className="h-4 w-4" />
            Läuft bald ab ({expiringSoonArticles?.length || 0})
          </TabsTrigger>
        </TabsList>

        {/* All Articles Tab */}
        <TabsContent value="all">
          <Card>
            <CardHeader>
              <CardTitle>Alle veröffentlichten Artikel</CardTitle>
              <CardDescription>
                Übersicht aller Artikel mit ihrem Verifizierungsstatus
              </CardDescription>
            </CardHeader>
            <CardContent>
              {articlesLoading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : allArticles && allArticles.length > 0 ? (
                <div className="space-y-2">
                  {allArticles.map((item) => (
                    <ArticleRow
                      key={item.article.id}
                      article={item.article}
                      verification={item.verification}
                      verifiedBy={item.verifiedBy}
                      onVerify={() => openVerifyDialog({ id: item.article.id, title: item.article.title })}
                      onUnverify={() => unverifyMutation.mutate({ articleId: item.article.id })}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  Keine veröffentlichten Artikel vorhanden
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Expired Tab */}
        <TabsContent value="expired">
          <Card>
            <CardHeader>
              <CardTitle className="text-red-600 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Abgelaufene Verifizierungen
              </CardTitle>
              <CardDescription>
                Diese Artikel müssen erneut geprüft werden
              </CardDescription>
            </CardHeader>
            <CardContent>
              {expiredArticles && expiredArticles.length > 0 ? (
                <div className="space-y-2">
                  {expiredArticles.map((item) => (
                    <ArticleRow
                      key={item.article.id}
                      article={item.article}
                      verification={item.verification}
                      verifiedBy={item.verifiedBy}
                      onVerify={() => openVerifyDialog({ id: item.article.id, title: item.article.title })}
                      onUnverify={() => unverifyMutation.mutate({ articleId: item.article.id })}
                      showExpiry
                    />
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  Keine abgelaufenen Verifizierungen
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Expiring Soon Tab */}
        <TabsContent value="expiring">
          <Card>
            <CardHeader>
              <CardTitle className="text-yellow-600 flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Bald ablaufende Verifizierungen
              </CardTitle>
              <CardDescription>
                Diese Artikel sollten bald erneut geprüft werden
              </CardDescription>
            </CardHeader>
            <CardContent>
              {expiringSoonArticles && expiringSoonArticles.length > 0 ? (
                <div className="space-y-2">
                  {expiringSoonArticles.map((item) => (
                    <ArticleRow
                      key={item.article.id}
                      article={item.article}
                      verification={item.verification}
                      verifiedBy={item.verifiedBy}
                      onVerify={() => openVerifyDialog({ id: item.article.id, title: item.article.title })}
                      onUnverify={() => unverifyMutation.mutate({ articleId: item.article.id })}
                      showExpiry
                    />
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  Keine bald ablaufenden Verifizierungen
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Verify Dialog */}
      <Dialog open={verifyDialogOpen} onOpenChange={setVerifyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Artikel verifizieren</DialogTitle>
            <DialogDescription>
              Markieren Sie "{selectedArticle?.title}" als geprüft und aktuell.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Gültig bis
              </label>
              <Input
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Nach diesem Datum wird der Artikel zur erneuten Prüfung markiert
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Notizen (optional)</label>
              <Textarea
                placeholder="z.B. Geprüft von Max Mustermann, alle Informationen aktuell"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVerifyDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button onClick={handleVerify} disabled={verifyMutation.isPending}>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Als verifiziert markieren
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Article Row Component
function ArticleRow({
  article,
  verification,
  verifiedBy,
  onVerify,
  onUnverify,
  showExpiry = false,
}: {
  article: { id: number; title: string; slug: string; updatedAt: Date | null };
  verification: { isVerified: boolean; verifiedAt: Date | null; expiresAt: Date | null; notes: string | null } | null;
  verifiedBy: { id: number; name: string | null } | null;
  onVerify: () => void;
  onUnverify: () => void;
  showExpiry?: boolean;
}) {
  const isExpired = verification?.expiresAt && new Date(verification.expiresAt) <= new Date();
  
  return (
    <div className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50">
      <div className="flex items-center gap-4">
        {verification?.isVerified ? (
          isExpired ? (
            <ShieldAlert className="h-5 w-5 text-red-500" />
          ) : (
            <ShieldCheck className="h-5 w-5 text-green-500" />
          )
        ) : (
          <Shield className="h-5 w-5 text-muted-foreground" />
        )}
        <div>
          <Link
            href={`/wiki/article/${article.slug}`}
            className="font-medium hover:underline flex items-center gap-1"
          >
            {article.title}
            <ExternalLink className="h-3 w-3" />
          </Link>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {verification?.isVerified ? (
              <>
                <CheckCircle2 className="h-3 w-3 text-green-500" />
                <span>
                  Verifiziert von {verifiedBy?.name || "Unbekannt"} am{" "}
                  {verification.verifiedAt
                    ? new Date(verification.verifiedAt).toLocaleDateString("de-DE")
                    : "-"}
                </span>
                {showExpiry && verification.expiresAt && (
                  <Badge variant={isExpired ? "destructive" : "secondary"} className="ml-2">
                    {isExpired ? "Abgelaufen" : `Gültig bis ${new Date(verification.expiresAt).toLocaleDateString("de-DE")}`}
                  </Badge>
                )}
              </>
            ) : (
              <>
                <XCircle className="h-3 w-3" />
                <span>Nicht verifiziert</span>
              </>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {verification?.isVerified ? (
          <>
            <Button size="sm" variant="outline" onClick={onVerify}>
              Erneut prüfen
            </Button>
            <Button size="sm" variant="ghost" onClick={onUnverify}>
              Entfernen
            </Button>
          </>
        ) : (
          <Button size="sm" onClick={onVerify}>
            <CheckCircle2 className="h-4 w-4 mr-1" />
            Verifizieren
          </Button>
        )}
      </div>
    </div>
  );
}
