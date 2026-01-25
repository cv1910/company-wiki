import { useState, useEffect, useCallback } from "react";

export interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
  onClick?: () => void;
}

export function useBrowserNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    // Check if browser supports notifications
    if ("Notification" in window) {
      setIsSupported(true);
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      console.warn("Browser notifications are not supported");
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result === "granted";
    } catch (error) {
      console.error("Error requesting notification permission:", error);
      return false;
    }
  }, [isSupported]);

  const showNotification = useCallback(
    (options: NotificationOptions) => {
      if (!isSupported || permission !== "granted") {
        console.warn("Cannot show notification: permission not granted");
        return null;
      }

      try {
        const notification = new Notification(options.title, {
          body: options.body,
          icon: options.icon || "/favicon.ico",
          tag: options.tag,
          requireInteraction: false,
        });

        if (options.onClick) {
          notification.onclick = () => {
            window.focus();
            options.onClick?.();
            notification.close();
          };
        }

        // Auto-close after 10 seconds
        setTimeout(() => notification.close(), 10000);

        return notification;
      } catch (error) {
        console.error("Error showing notification:", error);
        return null;
      }
    },
    [isSupported, permission]
  );

  return {
    isSupported,
    permission,
    requestPermission,
    showNotification,
    isGranted: permission === "granted",
    isDenied: permission === "denied",
  };
}

// Helper to format reminder time for notification
export function formatReminderMessage(taskTitle: string, minutesUntilDue: number): string {
  if (minutesUntilDue <= 0) {
    return `"${taskTitle}" ist jetzt fällig!`;
  }
  if (minutesUntilDue < 60) {
    return `"${taskTitle}" ist in ${minutesUntilDue} Minuten fällig`;
  }
  if (minutesUntilDue < 1440) {
    const hours = Math.round(minutesUntilDue / 60);
    return `"${taskTitle}" ist in ${hours} Stunde${hours > 1 ? "n" : ""} fällig`;
  }
  const days = Math.round(minutesUntilDue / 1440);
  return `"${taskTitle}" ist in ${days} Tag${days > 1 ? "en" : ""} fällig`;
}
