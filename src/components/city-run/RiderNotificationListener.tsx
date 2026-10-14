"use client";

import { useCallback, useEffect, useRef } from "react";
import {
  clearRiderTabBadge,
  enableRiderNotifications,
  initRiderTabBadge,
  notifyRiderNewRide,
  startRiderAlarm,
  unlockRiderSound,
} from "@/lib/city-run/notifications";
import { useOrdersRealtime } from "@/lib/city-run/use-orders-realtime";
import type { DeliveryOrder } from "@/lib/city-run/types";

const kindLabels = {
  send: "Send",
  receive: "Receive",
  "store-pickup": "Store pickup",
} as const;

const POLL_MS = 2500;

function alertForOrder(order: DeliveryOrder) {
  notifyRiderNewRide(
    {
      title: "🚨 NEW RIDE REQUEST",
      body: `${kindLabels[order.kind]} · ${order.itemDescription} — ${order.pickup.formatted.slice(0, 48)}${order.pickup.formatted.length > 48 ? "…" : ""}`,
      href: "/cityrun/rider",
      tag: `new-ride-${order.id}`,
    },
    order,
  );
}

export function RiderNotificationListener() {
  const knownIds = useRef<Set<string>>(new Set());
  const ready = useRef(false);

  const checkNewRides = useCallback(async () => {
    const res = await fetch("/api/cityrun/rider/orders?filter=available", {
      cache: "no-store",
    });
    if (!res.ok) return;

    const orders = (await res.json()) as DeliveryOrder[];
    const currentIds = new Set(orders.map((o) => o.id));

    if (ready.current) {
      for (const order of orders) {
        if (!knownIds.current.has(order.id)) {
          alertForOrder(order);
        }
      }
    }

    knownIds.current = currentIds;
    ready.current = true;
  }, []);

  useOrdersRealtime(checkNewRides);

  useEffect(() => {
    initRiderTabBadge("City Run Rider");
    void enableRiderNotifications();

    function onVisible() {
      if (document.visibilityState === "visible") {
        clearRiderTabBadge();
      }
    }

    function unlockOnGesture() {
      void unlockRiderSound();
    }

    function onServiceWorkerMessage(event: MessageEvent) {
      const data = event.data as { type?: string; title?: string; body?: string; url?: string };
      if (data?.type !== "cityrun:rider-new-ride-push") return;
      startRiderAlarm();
      notifyRiderNewRide({
        title: data.title || "🚨 NEW RIDE REQUEST",
        body: data.body || "A new delivery is waiting — open the rider app to accept.",
        href: data.url || "/cityrun/rider",
        tag: "new-ride-push",
      });
    }

    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", clearRiderTabBadge);
    window.addEventListener("pointerdown", unlockOnGesture, { once: true });
    window.addEventListener("keydown", unlockOnGesture, { once: true });
    navigator.serviceWorker?.addEventListener("message", onServiceWorkerMessage);

    void checkNewRides();
    const poll = window.setInterval(() => void checkNewRides(), POLL_MS);

    return () => {
      window.clearInterval(poll);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", clearRiderTabBadge);
      navigator.serviceWorker?.removeEventListener("message", onServiceWorkerMessage);
      clearRiderTabBadge();
    };
  }, [checkNewRides]);

  return null;
}
