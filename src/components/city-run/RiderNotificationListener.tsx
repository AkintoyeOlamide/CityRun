"use client";

import { useEffect, useRef } from "react";
import {
  clearRiderTabBadge,
  initRiderTabBadge,
  notifyRiderNewRide,
} from "@/lib/city-run/notifications";
import type { DeliveryOrder } from "@/lib/city-run/types";

const kindLabels = {
  send: "Send",
  receive: "Receive",
  "store-pickup": "Store pickup",
} as const;

export function RiderNotificationListener() {
  const knownIds = useRef<Set<string>>(new Set());
  const ready = useRef(false);

  useEffect(() => {
    initRiderTabBadge("City Run Rider");

    function onVisible() {
      if (document.visibilityState === "visible") {
        clearRiderTabBadge();
      }
    }

    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", clearRiderTabBadge);

    async function checkAssigned() {
      const res = await fetch("/api/cityrun/rider/orders?filter=active");
      if (!res.ok) return;

      const orders = (await res.json()) as DeliveryOrder[];
      const currentIds = new Set(orders.map((o) => o.id));

      if (ready.current) {
        for (const order of orders) {
          if (!knownIds.current.has(order.id)) {
            notifyRiderNewRide({
              title: "Ride assigned to you",
              body: `${kindLabels[order.kind]} · ${order.itemDescription} — ${order.pickup.formatted.slice(0, 48)}${order.pickup.formatted.length > 48 ? "…" : ""}`,
              href: "/cityrun/rider",
              tag: `assigned-ride-${order.id}`,
            });
          }
        }
      }

      knownIds.current = currentIds;
      ready.current = true;
    }

    checkAssigned();
    const poll = window.setInterval(checkAssigned, 8000);

    return () => {
      window.clearInterval(poll);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", clearRiderTabBadge);
      clearRiderTabBadge();
    };
  }, []);

  return null;
}
