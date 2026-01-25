import { useState, useEffect } from "react";
import { Bell, BellOff, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBrowserNotifications } from "@/hooks/useBrowserNotifications";

export function NotificationPermissionBanner() {
  const { isSupported, permission, requestPermission, isGranted, isDenied } = useBrowserNotifications();
  const [dismissed, setDismissed] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);

  // Check localStorage for dismissed state
  useEffect(() => {
    const wasDismissed = localStorage.getItem("notification-banner-dismissed");
    if (wasDismissed === "true") {
      setDismissed(true);
    }
  }, []);

  // Don't show if not supported, already granted, or dismissed
  if (!isSupported || isGranted || dismissed) {
    return null;
  }

  // Don't show if denied (user explicitly blocked)
  if (isDenied) {
    return null;
  }

  const handleRequestPermission = async () => {
    setIsRequesting(true);
    await requestPermission();
    setIsRequesting(false);
  };

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem("notification-banner-dismissed", "true");
  };

  return (
    <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 mb-4 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/20 rounded-full">
          <Bell className="h-4 w-4 text-primary" />
        </div>
        <div className="text-sm">
          <p className="font-medium">Browser-Benachrichtigungen aktivieren</p>
          <p className="text-muted-foreground text-xs">
            Erhalte Erinnerungen für Aufgaben und Termine direkt im Browser.
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="default"
          size="sm"
          onClick={handleRequestPermission}
          disabled={isRequesting}
        >
          {isRequesting ? "..." : "Aktivieren"}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDismiss}
          className="h-8 w-8 p-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// Compact version for settings pages
export function NotificationPermissionToggle() {
  const { isSupported, permission, requestPermission, isGranted, isDenied } = useBrowserNotifications();
  const [isRequesting, setIsRequesting] = useState(false);

  if (!isSupported) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <BellOff className="h-4 w-4" />
        <span className="text-sm">Browser unterstützt keine Benachrichtigungen</span>
      </div>
    );
  }

  const handleToggle = async () => {
    if (isGranted) {
      // Can't revoke permission programmatically, show info
      return;
    }
    setIsRequesting(true);
    await requestPermission();
    setIsRequesting(false);
  };

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        {isGranted ? (
          <Bell className="h-4 w-4 text-green-500" />
        ) : isDenied ? (
          <BellOff className="h-4 w-4 text-red-500" />
        ) : (
          <Bell className="h-4 w-4 text-muted-foreground" />
        )}
        <div>
          <p className="text-sm font-medium">Browser-Benachrichtigungen</p>
          <p className="text-xs text-muted-foreground">
            {isGranted
              ? "Aktiviert - Du erhältst Erinnerungen im Browser"
              : isDenied
              ? "Blockiert - Aktiviere in den Browser-Einstellungen"
              : "Nicht aktiviert"}
          </p>
        </div>
      </div>
      {!isGranted && !isDenied && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleToggle}
          disabled={isRequesting}
        >
          {isRequesting ? "..." : "Aktivieren"}
        </Button>
      )}
      {isGranted && (
        <span className="text-xs text-green-600 bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded">
          Aktiv
        </span>
      )}
    </div>
  );
}
