import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import {
  Calendar,
  RefreshCw,
  Link2,
  Link2Off,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  ArrowLeftRight,
  ArrowDownToLine,
  ArrowUpFromLine,
  Settings,
  ChevronLeft,
} from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { useLocation } from "wouter";

export default function CalendarSettings() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();

  // Check if Google Calendar is configured
  const { data: configStatus } = trpc.googleCalendar.isConfigured.useQuery();

  // Get current connection status
  const { data: connection, isLoading: connectionLoading } =
    trpc.googleCalendar.getConnection.useQuery(undefined, {
      enabled: !!user,
    });

  // Get auth URL
  const { data: authUrlData } = trpc.googleCalendar.getAuthUrl.useQuery(undefined, {
    enabled: !!user && configStatus?.configured && !connection,
  });

  // Mutations
  const handleCallback = trpc.googleCalendar.handleCallback.useMutation({
    onSuccess: (data) => {
      toast.success(`Verbunden mit ${data.email}`);
      utils.googleCalendar.getConnection.invalidate();
      // Clear URL params
      window.history.replaceState({}, "", window.location.pathname);
    },
    onError: (error) => {
      toast.error("Verbindung fehlgeschlagen: " + error.message);
    },
  });

  const disconnect = trpc.googleCalendar.disconnect.useMutation({
    onSuccess: () => {
      toast.success("Google Calendar getrennt");
      utils.googleCalendar.getConnection.invalidate();
    },
    onError: (error) => {
      toast.error("Fehler beim Trennen: " + error.message);
    },
  });

  const toggleSync = trpc.googleCalendar.toggleSync.useMutation({
    onSuccess: () => {
      toast.success("Synchronisation aktualisiert");
      utils.googleCalendar.getConnection.invalidate();
    },
    onError: (error) => {
      toast.error("Fehler: " + error.message);
    },
  });

  const syncFromGoogle = trpc.googleCalendar.syncFromGoogle.useMutation({
    onSuccess: (data) => {
      toast.success(
        `Import abgeschlossen: ${data.created} neu, ${data.updated} aktualisiert, ${data.skipped} übersprungen`
      );
      utils.googleCalendar.getConnection.invalidate();
    },
    onError: (error) => {
      toast.error("Import fehlgeschlagen: " + error.message);
    },
  });

  const syncToGoogle = trpc.googleCalendar.syncToGoogle.useMutation({
    onSuccess: (data) => {
      toast.success(
        `Export abgeschlossen: ${data.created} neu, ${data.updated} aktualisiert`
      );
      utils.googleCalendar.getConnection.invalidate();
    },
    onError: (error) => {
      toast.error("Export fehlgeschlagen: " + error.message);
    },
  });

  const fullSync = trpc.googleCalendar.fullSync.useMutation({
    onSuccess: (data) => {
      const fromGoogle = data.fromGoogle;
      const toGoogle = data.toGoogle;
      toast.success(
        `Sync abgeschlossen: ${fromGoogle.created + toGoogle.created} neu, ${fromGoogle.updated + toGoogle.updated} aktualisiert`
      );
      utils.googleCalendar.getConnection.invalidate();
    },
    onError: (error) => {
      toast.error("Synchronisation fehlgeschlagen: " + error.message);
    },
  });

  // Handle OAuth callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const state = params.get("state");

    if (code && state && !handleCallback.isPending) {
      handleCallback.mutate({ code, state });
    }
  }, []);

  const handleConnect = () => {
    if (authUrlData?.url) {
      window.location.href = authUrlData.url;
    }
  };

  const getSyncStatusBadge = () => {
    if (!connection) return null;

    switch (connection.lastSyncStatus) {
      case "success":
        return (
          <Badge variant="outline" className="text-green-600 border-green-600">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Erfolgreich
          </Badge>
        );
      case "error":
        return (
          <Badge variant="outline" className="text-red-600 border-red-600">
            <XCircle className="h-3 w-3 mr-1" />
            Fehler
          </Badge>
        );
      case "pending":
        return (
          <Badge variant="outline" className="text-yellow-600 border-yellow-600">
            <Clock className="h-3 w-3 mr-1" />
            Ausstehend
          </Badge>
        );
      default:
        return null;
    }
  };

  const isSyncing =
    syncFromGoogle.isPending || syncToGoogle.isPending || fullSync.isPending;

  return (
    <DashboardLayout>
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation("/calendar")}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Zurück zum Kalender
          </Button>
        </div>

        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="h-6 w-6" />
            Kalender-Einstellungen
          </h1>
          <p className="text-muted-foreground mt-1">
            Verwalte deine Kalender-Integrationen und Synchronisation
          </p>
        </div>

        {/* Google Calendar Integration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Google Calendar
            </CardTitle>
            <CardDescription>
              Synchronisiere deine Termine mit Google Calendar für
              bidirektionalen Zugriff
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {!configStatus?.configured ? (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-yellow-800 dark:text-yellow-200">
                      Konfiguration erforderlich
                    </h4>
                    <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                      Um Google Calendar zu nutzen, müssen die API-Zugangsdaten
                      (Client ID und Client Secret) vom Administrator
                      konfiguriert werden.
                    </p>
                  </div>
                </div>
              </div>
            ) : connectionLoading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : connection ? (
              <>
                {/* Connected State */}
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="font-medium text-green-800 dark:text-green-200">
                          Verbunden
                        </p>
                        <p className="text-sm text-green-700 dark:text-green-300">
                          {connection.googleEmail}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => disconnect.mutate()}
                      disabled={disconnect.isPending}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Link2Off className="h-4 w-4 mr-1" />
                      Trennen
                    </Button>
                  </div>
                </div>

                <Separator />

                {/* Sync Settings */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="sync-enabled">
                        Automatische Synchronisation
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Termine automatisch zwischen beiden Kalendern
                        synchronisieren
                      </p>
                    </div>
                    <Switch
                      id="sync-enabled"
                      checked={connection.syncEnabled}
                      onCheckedChange={(checked) =>
                        toggleSync.mutate({ enabled: checked })
                      }
                      disabled={toggleSync.isPending}
                    />
                  </div>

                  {/* Last Sync Status */}
                  <div className="flex items-center justify-between py-2">
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium">Letzte Synchronisation</p>
                      <p className="text-sm text-muted-foreground">
                        {connection.lastSyncAt
                          ? format(
                              new Date(connection.lastSyncAt),
                              "dd. MMMM yyyy, HH:mm",
                              { locale: de }
                            )
                          : "Noch nie synchronisiert"}
                      </p>
                    </div>
                    {getSyncStatusBadge()}
                  </div>

                  {connection.lastSyncError && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                      <p className="text-sm text-red-700 dark:text-red-300">
                        <strong>Fehler:</strong> {connection.lastSyncError}
                      </p>
                    </div>
                  )}
                </div>

                <Separator />

                {/* Manual Sync Actions */}
                <div className="space-y-3">
                  <h4 className="font-medium">Manuelle Synchronisation</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <Button
                      variant="outline"
                      onClick={() => syncFromGoogle.mutate()}
                      disabled={isSyncing}
                      className="justify-start"
                    >
                      <ArrowDownToLine className="h-4 w-4 mr-2" />
                      Von Google importieren
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => syncToGoogle.mutate()}
                      disabled={isSyncing}
                      className="justify-start"
                    >
                      <ArrowUpFromLine className="h-4 w-4 mr-2" />
                      Zu Google exportieren
                    </Button>
                    <Button
                      onClick={() => fullSync.mutate()}
                      disabled={isSyncing}
                      className="justify-start"
                    >
                      {isSyncing ? (
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <ArrowLeftRight className="h-4 w-4 mr-2" />
                      )}
                      Vollständiger Sync
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Not Connected State */}
                <div className="text-center py-8 space-y-4">
                  <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                    <Calendar className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="font-medium">Nicht verbunden</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Verbinde deinen Google Calendar, um Termine zu
                      synchronisieren
                    </p>
                  </div>
                  <Button
                    onClick={handleConnect}
                    disabled={!authUrlData?.url || handleCallback.isPending}
                  >
                    <Link2 className="h-4 w-4 mr-2" />
                    Mit Google Calendar verbinden
                  </Button>
                </div>

                <Separator />

                {/* Benefits */}
                <div className="space-y-3">
                  <h4 className="font-medium">Vorteile der Verbindung</h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
                      <span>
                        Bidirektionale Synchronisation – Änderungen werden in
                        beide Richtungen übertragen
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
                      <span>
                        Automatische Updates – Neue Termine erscheinen sofort in
                        beiden Kalendern
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
                      <span>
                        Sichere Verbindung – Deine Daten werden verschlüsselt
                        übertragen
                      </span>
                    </li>
                  </ul>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
