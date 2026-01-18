import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calendar, Plus, Clock, CheckCircle, XCircle, AlertCircle, Loader2 } from "lucide-react";
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

export default function Leave() {
  const { user, loading: authLoading } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    leaveType: "vacation" as const,
    startDate: "",
    endDate: "",
    reason: "",
  });

  const utils = trpc.useUtils();
  const { data: balance, isLoading: balanceLoading } = trpc.leave.myBalance.useQuery();
  const { data: requests, isLoading: requestsLoading } = trpc.leave.myRequests.useQuery();

  const createRequest = trpc.leave.create.useMutation({
    onSuccess: () => {
      toast.success("Urlaubsantrag eingereicht");
      setIsDialogOpen(false);
      setFormData({ leaveType: "vacation", startDate: "", endDate: "", reason: "" });
      utils.leave.myRequests.invalidate();
      utils.leave.myBalance.invalidate();
    },
    onError: (error) => {
      toast.error("Fehler beim Einreichen: " + error.message);
    },
  });

  const cancelRequest = trpc.leave.cancel.useMutation({
    onSuccess: () => {
      toast.success("Antrag storniert");
      utils.leave.myRequests.invalidate();
      utils.leave.myBalance.invalidate();
    },
    onError: (error) => {
      toast.error("Fehler beim Stornieren: " + error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.startDate || !formData.endDate) {
      toast.error("Bitte Start- und Enddatum angeben");
      return;
    }
    createRequest.mutate(formData);
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Bitte melden Sie sich an.</p>
      </div>
    );
  }

  const remainingDays = balance ? balance.totalDays + balance.carryOverDays - balance.usedDays - balance.pendingDays : 0;

  return (
    <div className="space-y-6 page-transition">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Urlaub & Abwesenheit</h1>
          <p className="text-muted-foreground mt-1">
            Verwalten Sie Ihre Urlaubsanträge und sehen Sie Ihren Resturlaub
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 btn-interactive">
              <Plus className="w-4 h-4" />
              Neuer Antrag
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] animate-scale-in">
            <DialogHeader>
              <DialogTitle>Urlaubsantrag stellen</DialogTitle>
              <DialogDescription>
                Füllen Sie das Formular aus, um einen neuen Urlaubsantrag einzureichen.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="leaveType">Art der Abwesenheit</Label>
                <Select
                  value={formData.leaveType}
                  onValueChange={(value: any) => setFormData({ ...formData, leaveType: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {leaveTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Von</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">Bis</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    min={formData.startDate}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="reason">Grund (optional)</Label>
                <Textarea
                  id="reason"
                  placeholder="Zusätzliche Informationen..."
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  rows={3}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Abbrechen
                </Button>
                <Button type="submit" disabled={createRequest.isPending}>
                  {createRequest.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Einreichen
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="card-shadow animate-fade-in">
          <CardHeader className="pb-2">
            <CardDescription>Jahresurlaub</CardDescription>
            <CardTitle className="text-3xl">{balance?.totalDays || 30}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Tage für {new Date().getFullYear()}</p>
          </CardContent>
        </Card>
        <Card className="card-shadow animate-fade-in stagger-1">
          <CardHeader className="pb-2">
            <CardDescription>Genommen</CardDescription>
            <CardTitle className="text-3xl text-orange-600">{balance?.usedDays || 0}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Bereits genutzt</p>
          </CardContent>
        </Card>
        <Card className="card-shadow animate-fade-in stagger-2">
          <CardHeader className="pb-2">
            <CardDescription>Ausstehend</CardDescription>
            <CardTitle className="text-3xl text-yellow-600">{balance?.pendingDays || 0}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Warten auf Genehmigung</p>
          </CardContent>
        </Card>
        <Card className="card-shadow animate-fade-in stagger-3 bg-gradient-to-br from-primary/10 to-primary/5">
          <CardHeader className="pb-2">
            <CardDescription>Verfügbar</CardDescription>
            <CardTitle className="text-3xl text-primary">{remainingDays}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {balance?.carryOverDays ? `inkl. ${balance.carryOverDays} Resturlaub` : "Verbleibende Tage"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Requests List */}
      <Card className="card-shadow">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Meine Anträge
          </CardTitle>
          <CardDescription>Übersicht aller eingereichten Urlaubsanträge</CardDescription>
        </CardHeader>
        <CardContent>
          {requestsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 bg-muted rounded-lg skeleton-shimmer" />
              ))}
            </div>
          ) : !requests || requests.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">Keine Urlaubsanträge vorhanden</p>
              <p className="text-sm text-muted-foreground mt-1">
                Klicken Sie auf "Neuer Antrag" um einen Urlaubsantrag zu stellen.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {requests.map((request, index) => {
                const leaveType = leaveTypes.find((t) => t.value === request.leaveType);
                const status = statusConfig[request.status as keyof typeof statusConfig];
                const StatusIcon = status.icon;

                return (
                  <div
                    key={request.id}
                    className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors animate-fade-in"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <Badge className={leaveType?.color}>{leaveType?.label}</Badge>
                          <Badge variant="outline" className={status.color}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {status.label}
                          </Badge>
                        </div>
                        <p className="text-sm font-medium mt-1">
                          {format(new Date(request.startDate), "dd. MMM yyyy", { locale: de })} -{" "}
                          {format(new Date(request.endDate), "dd. MMM yyyy", { locale: de })}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {request.totalDays} {request.totalDays === 1 ? "Tag" : "Tage"}
                          {request.reason && ` • ${request.reason}`}
                        </p>
                        {request.approverComment && (
                          <p className="text-xs text-muted-foreground mt-1 italic">
                            Kommentar: {request.approverComment}
                          </p>
                        )}
                      </div>
                    </div>
                    {request.status === "pending" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => cancelRequest.mutate({ id: request.id })}
                        disabled={cancelRequest.isPending}
                        className="text-destructive hover:text-destructive"
                      >
                        Stornieren
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
