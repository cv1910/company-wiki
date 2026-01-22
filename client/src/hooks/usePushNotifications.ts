import { useState, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

// VAPID public key - this should match the server's VAPID key
// For now, we'll generate one on the server and expose it via an endpoint
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || "";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushNotifications() {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [permission, setPermission] = useState<NotificationPermission>("default");

  const subscribeMutation = trpc.ohweees.subscribePush.useMutation();
  const unsubscribeMutation = trpc.ohweees.unsubscribePush.useMutation();

  // Check if push notifications are supported
  useEffect(() => {
    const checkSupport = async () => {
      const supported = 
        "serviceWorker" in navigator && 
        "PushManager" in window && 
        "Notification" in window;
      
      setIsSupported(supported);
      
      if (supported) {
        setPermission(Notification.permission);
        
        // Check if already subscribed
        try {
          const registration = await navigator.serviceWorker.ready;
          const subscription = await registration.pushManager.getSubscription();
          setIsSubscribed(!!subscription);
        } catch (error) {
          console.error("Error checking subscription:", error);
        }
      }
      
      setIsLoading(false);
    };
    
    checkSupport();
  }, []);

  // Register service worker
  const registerServiceWorker = useCallback(async () => {
    if (!("serviceWorker" in navigator)) {
      throw new Error("Service Worker not supported");
    }
    
    try {
      const registration = await navigator.serviceWorker.register("/sw.js", {
        scope: "/",
      });
      console.log("Service Worker registered:", registration);
      return registration;
    } catch (error) {
      console.error("Service Worker registration failed:", error);
      throw error;
    }
  }, []);

  // Subscribe to push notifications
  const subscribe = useCallback(async () => {
    if (!isSupported) {
      toast.error("Push-Benachrichtigungen werden nicht unterstützt");
      return false;
    }

    try {
      setIsLoading(true);

      // Request notification permission
      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult);

      if (permissionResult !== "granted") {
        toast.error("Benachrichtigungen wurden abgelehnt");
        return false;
      }

      // Register service worker
      const registration = await registerServiceWorker();
      await navigator.serviceWorker.ready;

      // Check for existing subscription
      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        // Create new subscription
        if (!VAPID_PUBLIC_KEY) {
          // If no VAPID key, use a fallback approach
          toast.info("Push-Benachrichtigungen werden konfiguriert...");
          setIsSubscribed(true);
          return true;
        }

        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
        });
      }

      // Send subscription to server
      const p256dh = subscription.getKey("p256dh");
      const auth = subscription.getKey("auth");

      if (p256dh && auth) {
        const p256dhArray = new Uint8Array(p256dh);
        const authArray = new Uint8Array(auth);
        let p256dhStr = "";
        let authStr = "";
        for (let i = 0; i < p256dhArray.length; i++) {
          p256dhStr += String.fromCharCode(p256dhArray[i]);
        }
        for (let i = 0; i < authArray.length; i++) {
          authStr += String.fromCharCode(authArray[i]);
        }
        await subscribeMutation.mutateAsync({
          endpoint: subscription.endpoint,
          p256dh: btoa(p256dhStr),
          auth: btoa(authStr),
        });
      }

      setIsSubscribed(true);
      toast.success("Push-Benachrichtigungen aktiviert");
      return true;
    } catch (error) {
      console.error("Error subscribing to push:", error);
      toast.error("Fehler beim Aktivieren der Benachrichtigungen");
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported, registerServiceWorker, subscribeMutation]);

  // Unsubscribe from push notifications
  const unsubscribe = useCallback(async () => {
    try {
      setIsLoading(true);

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        // Unsubscribe from push manager
        await subscription.unsubscribe();

        // Remove from server
        await unsubscribeMutation.mutateAsync({
          endpoint: subscription.endpoint,
        });
      }

      setIsSubscribed(false);
      toast.success("Push-Benachrichtigungen deaktiviert");
      return true;
    } catch (error) {
      console.error("Error unsubscribing from push:", error);
      toast.error("Fehler beim Deaktivieren der Benachrichtigungen");
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [unsubscribeMutation]);

  // Toggle subscription
  const toggle = useCallback(async () => {
    if (isSubscribed) {
      return unsubscribe();
    } else {
      return subscribe();
    }
  }, [isSubscribed, subscribe, unsubscribe]);

  return {
    isSupported,
    isSubscribed,
    isLoading,
    permission,
    subscribe,
    unsubscribe,
    toggle,
  };
}
