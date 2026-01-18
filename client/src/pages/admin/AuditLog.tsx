import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
  Shield,
  User,
  FileText,
  Calendar,
  Filter,
  ChevronLeft,
  ChevronRight,
  Activity,
  Eye,
  Edit,
  Trash2,
  Plus,
  CheckCircle,
  XCircle,
  AlertCircle,
  Send,
  MessageSquare,
  Settings,
  Users,
  FolderOpen,
} from "lucide-react";
import { useState } from "react";
import { formatDistanceToNow, format } from "date-fns";
import { de } from "date-fns/locale";

const ITEMS_PER_PAGE = 25;

const actionIcons: Record<string, React.ReactNode> = {
  create: <Plus className="h-4 w-4 text-green-600" />,
  update: <Edit className="h-4 w-4 text-blue-600" />,
  delete: <Trash2 className="h-4 w-4 text-red-600" />,
  view: <Eye className="h-4 w-4 text-gray-600" />,
  review_requested: <Send className="h-4 w-4 text-yellow-600" />,
  review_approved: <CheckCircle className="h-4 w-4 text-green-600" />,
  review_rejected: <XCircle className="h-4 w-4 text-red-600" />,
  review_changes_requested: <AlertCircle className="h-4 w-4 text-orange-600" />,
  login: <User className="h-4 w-4 text-blue-600" />,
  logout: <User className="h-4 w-4 text-gray-600" />,
  feedback: <MessageSquare className="h-4 w-4 text-purple-600" />,
  settings_change: <Settings className="h-4 w-4 text-gray-600" />,
};

const resourceTypeIcons: Record<string, React.ReactNode> = {
  article: <FileText className="h-4 w-4" />,
  category: <FolderOpen className="h-4 w-4" />,
  user: <Users className="h-4 w-4" />,
  sop: <FileText className="h-4 w-4" />,
  template: <FileText className="h-4 w-4" />,
  settings: <Settings className="h-4 w-4" />,
};

const actionLabels: Record<string, string> = {
  create: "Erstellt",
  update: "Aktualisiert",
  delete: "Gelöscht",
  view: "Angesehen",
  review_requested: "Review angefragt",
  review_approved: "Review genehmigt",
  review_rejected: "Review abgelehnt",
  review_changes_requested: "Änderungen angefordert",
  login: "Angemeldet",
  logout: "Abgemeldet",
  feedback: "Feedback gegeben",
  settings_change: "Einstellungen geändert",
};

const resourceTypeLabels: Record<string, string> = {
  article: "Artikel",
  category: "Kategorie",
  user: "Benutzer",
  sop: "SOP",
  template: "Vorlage",
  settings: "Einstellungen",
};

export default function AdminAuditLog() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [actionFilter, setActionFilter] = useState<string>("all");
  const [resourceTypeFilter, setResourceTypeFilter] = useState<string>("all");
  const [page, setPage] = useState(0);

  const { data: auditEntries, isLoading } = trpc.auditLog.list.useQuery({
    action: actionFilter !== "all" ? actionFilter : undefined,
    resourceType: resourceTypeFilter !== "all" ? resourceTypeFilter : undefined,
    limit: ITEMS_PER_PAGE,
    offset: page * ITEMS_PER_PAGE,
  });

  const { data: totalCount } = trpc.auditLog.count.useQuery({
    action: actionFilter !== "all" ? actionFilter : undefined,
    resourceType: resourceTypeFilter !== "all" ? resourceTypeFilter : undefined,
  });

  const { data: availableActions } = trpc.auditLog.getActions.useQuery();
  const { data: availableResourceTypes } = trpc.auditLog.getResourceTypes.useQuery();

  const totalPages = Math.ceil((totalCount || 0) / ITEMS_PER_PAGE);

  if (!isAdmin) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-medium mb-2">Keine Berechtigung</h2>
        <p className="text-muted-foreground">
          Nur Administratoren können das Audit-Log einsehen.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-3">
          <Shield className="h-7 w-7 text-primary" />
          Audit-Log
        </h1>
        <p className="text-muted-foreground mt-1">
          Vollständige Protokollierung aller Systemaktivitäten
        </p>
      </div>

      {/* Stats */}
      <div className="grid sm:grid-cols-3 gap-4">
        <Card className="card-shadow">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Activity className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-semibold">{totalCount || 0}</p>
              <p className="text-sm text-muted-foreground">Gesamte Einträge</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="card-shadow">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filter:</span>
            </div>

            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Alle Aktionen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Aktionen</SelectItem>
                {availableActions?.map((action) => (
                  <SelectItem key={action} value={action}>
                    {actionLabels[action] || action}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={resourceTypeFilter} onValueChange={setResourceTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Alle Ressourcen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Ressourcen</SelectItem>
                {availableResourceTypes?.map((type) => (
                  <SelectItem key={type} value={type}>
                    {resourceTypeLabels[type] || type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {(actionFilter !== "all" || resourceTypeFilter !== "all") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setActionFilter("all");
                  setResourceTypeFilter("all");
                  setPage(0);
                }}
              >
                Filter zurücksetzen
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Audit Log Table */}
      <Card className="card-shadow">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[180px]">Zeitpunkt</TableHead>
                <TableHead>Benutzer</TableHead>
                <TableHead>Aktion</TableHead>
                <TableHead>Ressource</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {auditEntries && auditEntries.length > 0 ? (
                auditEntries.map((entry: any) => (
                  <TableRow key={entry.id}>
                    <TableCell className="text-sm">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div>{format(new Date(entry.createdAt), "dd.MM.yyyy")}</div>
                          <div className="text-xs text-muted-foreground">
                            {format(new Date(entry.createdAt), "HH:mm:ss")}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <div className="font-medium text-sm">
                            {entry.userName || "Unbekannt"}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {entry.userEmail || `User #${entry.userId}`}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="gap-1">
                        {actionIcons[entry.action] || <Activity className="h-4 w-4" />}
                        {actionLabels[entry.action] || entry.action}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {resourceTypeIcons[entry.resourceType] || (
                          <FileText className="h-4 w-4" />
                        )}
                        <div>
                          <div className="text-sm">
                            {resourceTypeLabels[entry.resourceType] || entry.resourceType}
                          </div>
                          {entry.resourceTitle && (
                            <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                              {entry.resourceTitle}
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {entry.details && (
                        <div className="text-xs text-muted-foreground max-w-[200px] truncate">
                          {typeof entry.details === "object"
                            ? JSON.stringify(entry.details)
                            : entry.details}
                        </div>
                      )}
                      {entry.ipAddress && (
                        <div className="text-xs text-muted-foreground">
                          IP: {entry.ipAddress}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12">
                    <div className="flex flex-col items-center gap-2">
                      <Activity className="h-8 w-8 text-muted-foreground" />
                      <p className="text-muted-foreground">Keine Einträge gefunden</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Seite {page + 1} von {totalPages} ({totalCount} Einträge)
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Zurück
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
            >
              Weiter
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
