import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Settings as SettingsIcon, Database, Bot, Bell, Shield } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "@/lib/hapticToast";

export default function AdminSettings() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  // Settings state (these would typically be loaded from/saved to the backend)
  const [wikiName, setWikiName] = useState("Company Wiki");
  const [aiEnabled, setAiEnabled] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [publicAccess, setPublicAccess] = useState(false);

  const isAdmin = user?.role === "admin";

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

  const handleSave = () => {
    // In a real app, this would save to the backend
    toast.success("Einstellungen gespeichert");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Einstellungen</h1>
        <p className="text-muted-foreground mt-1">
          Konfigurieren Sie das Company Wiki
        </p>
      </div>

      {/* General Settings */}
      <Card className="card-shadow">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SettingsIcon className="h-5 w-5" />
            Allgemeine Einstellungen
          </CardTitle>
          <CardDescription>
            Grundlegende Konfiguration des Wikis
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="wikiName">Wiki-Name</Label>
            <Input
              id="wikiName"
              value={wikiName}
              onChange={(e) => setWikiName(e.target.value)}
              placeholder="Company Wiki"
              className="mt-1.5 max-w-md"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Wird in der Navigation und im Titel angezeigt
            </p>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="publicAccess">Öffentlicher Zugang</Label>
              <p className="text-sm text-muted-foreground">
                Erlaubt nicht angemeldeten Benutzern, öffentliche Artikel zu lesen
              </p>
            </div>
            <Switch
              id="publicAccess"
              checked={publicAccess}
              onCheckedChange={setPublicAccess}
            />
          </div>
        </CardContent>
      </Card>

      {/* AI Settings */}
      <Card className="card-shadow">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            AI-Assistent
          </CardTitle>
          <CardDescription>
            Konfiguration des AI-Chat-Assistenten
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="aiEnabled">AI-Assistent aktiviert</Label>
              <p className="text-sm text-muted-foreground">
                Ermöglicht Benutzern, Fragen an den AI-Assistenten zu stellen
              </p>
            </div>
            <Switch
              id="aiEnabled"
              checked={aiEnabled}
              onCheckedChange={setAiEnabled}
            />
          </div>

          <Separator />

          <div className="p-4 rounded-lg bg-muted/50">
            <h4 className="font-medium mb-2">Hinweis</h4>
            <p className="text-sm text-muted-foreground">
              Der AI-Assistent nutzt die Wiki-Inhalte und SOPs als Wissensbasis. 
              Stellen Sie sicher, dass alle wichtigen Informationen im Wiki dokumentiert sind,
              damit der Assistent präzise Antworten geben kann.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card className="card-shadow">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Benachrichtigungen
          </CardTitle>
          <CardDescription>
            Einstellungen für Benutzerbenachrichtigungen
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="notificationsEnabled">Benachrichtigungen aktiviert</Label>
              <p className="text-sm text-muted-foreground">
                Benutzer erhalten Benachrichtigungen bei Änderungen an abonnierten Artikeln
              </p>
            </div>
            <Switch
              id="notificationsEnabled"
              checked={notificationsEnabled}
              onCheckedChange={setNotificationsEnabled}
            />
          </div>
        </CardContent>
      </Card>

      {/* Security Settings */}
      <Card className="card-shadow">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Sicherheit
          </CardTitle>
          <CardDescription>
            Sicherheitseinstellungen und Zugriffsrechte
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
            <h4 className="font-medium text-green-700 mb-2">Google Workspace SSO aktiv</h4>
            <p className="text-sm text-green-600">
              Die Authentifizierung erfolgt ausschließlich über Google Workspace. 
              Nur Benutzer mit einem gültigen Google-Konto können sich anmelden.
            </p>
          </div>

          <div className="mt-4 space-y-2 text-sm text-muted-foreground">
            <p>• Neue Benutzer erhalten automatisch die Rolle "Benutzer"</p>
            <p>• Admins können Benutzerrollen in der Benutzerverwaltung ändern</p>
            <p>• Sitzungen laufen nach 7 Tagen Inaktivität ab</p>
          </div>
        </CardContent>
      </Card>

      {/* Database Info */}
      <Card className="card-shadow">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Datenbank
          </CardTitle>
          <CardDescription>
            Informationen zur Datenbank
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Typ</p>
              <p className="font-medium">MySQL / TiDB</p>
            </div>
            <div>
              <p className="text-muted-foreground">Status</p>
              <p className="font-medium text-green-600">Verbunden</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} className="card-shadow">
          Einstellungen speichern
        </Button>
      </div>
    </div>
  );
}
