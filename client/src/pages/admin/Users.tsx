import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { Shield, ShieldCheck, User, Users as UsersIcon, UserPlus } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "@/lib/hapticToast";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { InviteUserDialog } from "@/components/InviteUserDialog";

export default function AdminUsers() {
  const { user: currentUser } = useAuth();
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();

  const { data: users, isLoading } = trpc.users.list.useQuery();

  const updateRole = trpc.users.updateRole.useMutation({
    onSuccess: () => {
      toast.success("Benutzerrolle aktualisiert");
      utils.users.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const isAdmin = currentUser?.role === "admin";

  if (!isAdmin) {
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

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "admin":
        return (
          <Badge variant="default" className="bg-primary">
            <ShieldCheck className="h-3 w-3 mr-1" />
            Admin
          </Badge>
        );
      case "editor":
        return (
          <Badge variant="secondary">
            <Shield className="h-3 w-3 mr-1" />
            Editor
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            <User className="h-3 w-3 mr-1" />
            Benutzer
          </Badge>
        );
    }
  };

  const handleRoleChange = (userId: number, newRole: string) => {
    if (userId === currentUser?.id) {
      toast.error("Sie können Ihre eigene Rolle nicht ändern");
      return;
    }
    updateRole.mutate({ userId, role: newRole as "user" | "editor" | "admin" });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Benutzerverwaltung</h1>
          <p className="text-muted-foreground mt-1">
            Verwalten Sie Benutzer und deren Berechtigungen
          </p>
        </div>
        <InviteUserDialog
          trigger={
            <Button>
              <UserPlus className="h-4 w-4 mr-2" />
              Benutzer einladen
            </Button>
          }
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="card-shadow">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <UsersIcon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-semibold">{users?.length || 0}</p>
                <p className="text-sm text-muted-foreground">Gesamt</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-shadow">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <Shield className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-semibold">
                  {users?.filter((u) => u.role === "editor").length || 0}
                </p>
                <p className="text-sm text-muted-foreground">Editoren</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-shadow">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/10">
                <ShieldCheck className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-semibold">
                  {users?.filter((u) => u.role === "admin").length || 0}
                </p>
                <p className="text-sm text-muted-foreground">Admins</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Users Table */}
      <Card className="card-shadow">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-1/3 mb-2" />
                    <Skeleton className="h-3 w-1/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : users && users.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Benutzer</TableHead>
                  <TableHead>E-Mail</TableHead>
                  <TableHead>Rolle</TableHead>
                  <TableHead>Letzte Anmeldung</TableHead>
                  <TableHead>Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {user.name?.charAt(0).toUpperCase() || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{user.name || "Unbekannt"}</p>
                          {user.id === currentUser?.id && (
                            <p className="text-xs text-muted-foreground">(Sie)</p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {user.email || "-"}
                    </TableCell>
                    <TableCell>{getRoleBadge(user.role)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {user.lastSignedIn
                        ? format(new Date(user.lastSignedIn), "dd.MM.yyyy HH:mm", {
                            locale: de,
                          })
                        : "-"}
                    </TableCell>
                    <TableCell>
                      {user.id !== currentUser?.id ? (
                        <Select
                          value={user.role}
                          onValueChange={(v) => handleRoleChange(user.id, v)}
                          disabled={updateRole.isPending}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="user">Benutzer</SelectItem>
                            <SelectItem value="editor">Editor</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="p-8 text-center">
              <UsersIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Keine Benutzer gefunden</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Role Descriptions */}
      <Card className="card-shadow">
        <CardContent className="p-6">
          <h3 className="font-medium mb-4">Rollenbeschreibungen</h3>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <Badge variant="outline" className="mt-0.5">
                <User className="h-3 w-3 mr-1" />
                Benutzer
              </Badge>
              <p className="text-muted-foreground">
                Kann Wiki-Artikel und SOPs lesen, Kommentare schreiben und den AI-Assistenten nutzen.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <Badge variant="secondary" className="mt-0.5">
                <Shield className="h-3 w-3 mr-1" />
                Editor
              </Badge>
              <p className="text-muted-foreground">
                Alle Benutzerrechte plus: Artikel und SOPs erstellen, bearbeiten und löschen.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <Badge variant="default" className="bg-primary mt-0.5">
                <ShieldCheck className="h-3 w-3 mr-1" />
                Admin
              </Badge>
              <p className="text-muted-foreground">
                Alle Editorrechte plus: Benutzerverwaltung, Kategorien verwalten, Systemeinstellungen.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
