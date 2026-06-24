"use client";

import type { PushAudience } from "@/lib/city-run/push-subscriptions-store";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function isPushSupported() {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export async function registerCityRunServiceWorker() {
  if (!("serviceWorker" in navigator)) return null;
  const registration = await navigator.serviceWorker.register("/sw.js", {
    scope: "/",
  });
  await registration.update();
  return registration;
}

export async function subscribeToPhonePush(
  audience: PushAudience,
): Promise<boolean> {
  if (!isPushSupported()) return false;

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
  if (!publicKey) return false;

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return false;

  const registration = await registerCityRunServiceWorker();
  if (!registration) return false;

  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
  }

  const json = subscription.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    return false;
  }

  const res = await fetch("/api/cityrun/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      audience,
      subscription: {
        endpoint: json.endpoint,
        keys: {
          p256dh: json.keys.p256dh,
          auth: json.keys.auth,
        },
      },
    }),
  });

  return res.ok;
}

export async function syncPhonePushSubscription(audience: PushAudience) {
  if (!isPushSupported()) return false;
  if (Notification.permission !== "granted") return false;
  if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim()) return false;

  try {
    return await subscribeToPhonePush(audience);
  } catch {
    return false;
  }
}

export async function showPhoneNotification(payload: {
  title: string;
  body: string;
  tag?: string;
  href?: string;
}) {
  if (Notification.permission !== "granted") return;

  const options = {
    body: payload.body,
    icon: "/icon-192.png",
    badge: "/favicon-32.png",
    tag: payload.tag,
    data: { url: payload.href || "/cityrun/home" },
    requireInteraction: true,
    vibrate: [180, 80, 180],
  } as NotificationOptions;

  try {
    const registration = await navigator.serviceWorker.ready;
    await registration.showNotification(payload.title, options);
    return;
  } catch {
    /* fall through */
  }

  try {
    new Notification(payload.title, options);
  } catch {
    /* ignore */
  }
}
