import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const VAPID_STORAGE_KEY = "push-subscription-registered";

export function usePushNotifications() {
  const { user } = useAuth();
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");

  useEffect(() => {
    const supported =
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window;
    setIsSupported(supported);

    if (supported) {
      setPermission(Notification.permission);
    }
  }, []);

  useEffect(() => {
    if (!isSupported || !user) return;

    // Check existing subscription
    navigator.serviceWorker.ready.then((registration) => {
      registration.pushManager.getSubscription().then((sub) => {
        setIsSubscribed(!!sub);
      });
    });
  }, [isSupported, user]);

  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported || !user) return false;

    try {
      // Request notification permission
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== "granted") return false;

      // Register the push service worker
      const registration = await navigator.serviceWorker.register("/sw-push.js", {
        scope: "/",
      });

      // For now, use local notifications since we don't have a VAPID key setup
      // The service worker is registered and ready to receive push events
      setIsSubscribed(true);
      localStorage.setItem(VAPID_STORAGE_KEY, "true");

      return true;
    } catch (err) {
      console.error("Push subscription failed:", err);
      return false;
    }
  }, [isSupported, user]);

  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported) return false;

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await subscription.unsubscribe();
      }
      setIsSubscribed(false);
      localStorage.removeItem(VAPID_STORAGE_KEY);
      return true;
    } catch (err) {
      console.error("Push unsubscription failed:", err);
      return false;
    }
  }, [isSupported]);

  // Send a local notification via the service worker
  const sendLocalNotification = useCallback(
    async (title: string, options?: NotificationOptions) => {
      if (!isSupported || Notification.permission !== "granted") return;

      try {
        const registration = await navigator.serviceWorker.ready;
        await registration.showNotification(title, {
          icon: "/pwa-192.png",
          badge: "/pwa-192.png",
          ...options,
        } as any);
      } catch {
        // Fallback to regular Notification API
        new Notification(title, options);
      }
    },
    [isSupported]
  );

  return {
    isSupported,
    isSubscribed,
    permission,
    subscribe,
    unsubscribe,
    sendLocalNotification,
  };
}
