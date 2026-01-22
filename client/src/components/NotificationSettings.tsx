import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Bell,
  BellOff,
  MessageSquare,
  AtSign,
  Users,
  Volume2,
  CheckSquare,
  FileText,
  Mail,
  Loader2,
  Smartphone,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { usePushNotifications } from "@/hooks/usePushNotifications";

interface NotificationSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NotificationSettings({
  open,
  onOpenChange,
}: NotificationSettingsProps) {
  const { data: settings, isLoading } =
    trpc.settings.getNotificationSettings.useQuery(undefined, {
      enabled: open,
    });

  const {
    isSupported: pushSupported,
    isSubscribed: pushSubscribed,
    isLoading: pushLoading,
    permission: pushPermission,
    toggle: togglePush,
  } = usePushNotifications();

  const updateSettings = trpc.settings.updateNotificationSettings.useMutation({
    onSuccess: () => {
      toast.success("Einstellungen gespeichert");
    },
    onError: () => {
      toast.error("Fehler beim Speichern");
    },
  });

  const [localSettings, setLocalSettings] = useState({
    mentionsEnabled: true,
    directMessagesEnabled: true,
    roomUpdatesEnabled: true,
    soundEnabled: true,
    taskRemindersEnabled: true,
    taskAssignmentsEnabled: true,
    articleUpdatesEnabled: false,
    browserNotificationsEnabled: true,
    emailDigestEnabled: false,
    emailDigestFrequency: "never" as "daily" | "weekly" | "never",
  });

  useEffect(() => {
    if (settings) {
      setLocalSettings({
        mentionsEnabled: settings.mentionsEnabled,
        directMessagesEnabled: settings.directMessagesEnabled,
        roomUpdatesEnabled: settings.roomUpdatesEnabled,
        soundEnabled: settings.soundEnabled,
        taskRemindersEnabled: settings.taskRemindersEnabled,
        taskAssignmentsEnabled: settings.taskAssignmentsEnabled,
        articleUpdatesEnabled: settings.articleUpdatesEnabled,
        browserNotificationsEnabled: settings.browserNotificationsEnabled,
        emailDigestEnabled: settings.emailDigestEnabled,
        emailDigestFrequency: settings.emailDigestFrequency,
      });
    }
  }, [settings]);

  const handleToggle = (key: keyof typeof localSettings, value: boolean) => {
    setLocalSettings((prev) => ({ ...prev, [key]: value }));
    updateSettings.mutate({ [key]: value });
  };

  const handleFrequencyChange = (value: "daily" | "weekly" | "never") => {
    setLocalSettings((prev) => ({ ...prev, emailDigestFrequency: value }));
    updateSettings.mutate({ emailDigestFrequency: value });
  };

  const SettingRow = ({
    icon: Icon,
    label,
    description,
    settingKey,
  }: {
    icon: React.ElementType;
    label: string;
    description: string;
    settingKey: keyof typeof localSettings;
  }) => (
    <div className="flex items-center justify-between py-3">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 p-2 rounded-lg bg-muted">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <div>
          <Label className="text-sm font-medium">{label}</Label>
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        </div>
      </div>
      <Switch
        checked={localSettings[settingKey] as boolean}
        onCheckedChange={(checked) => handleToggle(settingKey, checked)}
        disabled={updateSettings.isPending}
      />
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Benachrichtigungs-Einstellungen
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Ohweees Section */}
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-2">
                Ohweees Chat
              </h3>
              <div className="space-y-1">
                <SettingRow
                  icon={AtSign}
                  label="@Erwähnungen"
                  description="Benachrichtigung wenn du erwähnt wirst"
                  settingKey="mentionsEnabled"
                />
                <SettingRow
                  icon={MessageSquare}
                  label="Direktnachrichten"
                  description="Benachrichtigung bei neuen Direktnachrichten"
                  settingKey="directMessagesEnabled"
                />
                <SettingRow
                  icon={Users}
                  label="Raum-Updates"
                  description="Benachrichtigung bei neuen Nachrichten in Räumen"
                  settingKey="roomUpdatesEnabled"
                />
                <SettingRow
                  icon={Volume2}
                  label="Sound"
                  description="Ton bei neuen Nachrichten abspielen"
                  settingKey="soundEnabled"
                />
              </div>
            </div>

            <Separator />

            {/* Tasks Section */}
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-2">
                Aufgaben
              </h3>
              <div className="space-y-1">
                <SettingRow
                  icon={CheckSquare}
                  label="Erinnerungen"
                  description="Benachrichtigung bei fälligen Aufgaben"
                  settingKey="taskRemindersEnabled"
                />
                <SettingRow
                  icon={CheckSquare}
                  label="Zuweisungen"
                  description="Benachrichtigung wenn dir eine Aufgabe zugewiesen wird"
                  settingKey="taskAssignmentsEnabled"
                />
              </div>
            </div>

            <Separator />

            {/* Wiki Section */}
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-2">
                Wiki & Artikel
              </h3>
              <div className="space-y-1">
                <SettingRow
                  icon={FileText}
                  label="Artikel-Updates"
                  description="Benachrichtigung bei Änderungen an Artikeln die du verfolgst"
                  settingKey="articleUpdatesEnabled"
                />
              </div>
            </div>

            <Separator />

            {/* Browser & Email Section */}
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-2">
                Zustellung
              </h3>
              <div className="space-y-1">
                {/* Push Notifications Toggle */}
                <div className="flex items-center justify-between py-3">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 p-2 rounded-lg bg-muted">
                      <Smartphone className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Push-Benachrichtigungen</Label>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {!pushSupported
                          ? "Nicht unterstützt in diesem Browser"
                          : pushPermission === "denied"
                          ? "In Browser-Einstellungen blockiert"
                          : pushSubscribed
                          ? "Aktiv - Du erhältst Benachrichtigungen"
                          : "Aktivieren für sofortige Benachrichtigungen"}
                      </p>
                    </div>
                  </div>
                  {pushSupported && pushPermission !== "denied" ? (
                    <Switch
                      checked={pushSubscribed}
                      onCheckedChange={togglePush}
                      disabled={pushLoading}
                    />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>

                <SettingRow
                  icon={Bell}
                  label="Browser-Benachrichtigungen"
                  description="Push-Benachrichtigungen im Browser anzeigen"
                  settingKey="browserNotificationsEnabled"
                />
                <SettingRow
                  icon={Mail}
                  label="E-Mail-Zusammenfassung"
                  description="Regelmäßige Zusammenfassung per E-Mail erhalten"
                  settingKey="emailDigestEnabled"
                />

                {localSettings.emailDigestEnabled && (
                  <div className="ml-11 mt-2">
                    <Label className="text-xs text-muted-foreground mb-1.5 block">
                      Häufigkeit
                    </Label>
                    <Select
                      value={localSettings.emailDigestFrequency}
                      onValueChange={handleFrequencyChange}
                      disabled={updateSettings.isPending}
                    >
                      <SelectTrigger className="w-40 h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Täglich</SelectItem>
                        <SelectItem value="weekly">Wöchentlich</SelectItem>
                        <SelectItem value="never">Nie</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Schließen
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
