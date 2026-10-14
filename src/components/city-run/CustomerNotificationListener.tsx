"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { isSupabaseBrowserConfigured } from "@/lib/supabase/client";
import { tryCreateClient } from "@/utils/supabase/client";
import { rowToOrder, type DeliveryOrderRow } from "@/lib/city-run/db-mapper";
import {
  invalidateMyOrdersCache,
  notifyOrdersChanged,
} from "@/lib/city-run/my-orders-cache";
import { notifyCityRun } from "@/lib/city-run/notifications";
import { customerStatusLabels, isActiveDelivery } from "@/lib/city-run/status-config";
import type { DeliveryOrder, DeliveryOrderStatus } from "@/lib/city-run/types";
import { useAuth } from "@/lib/auth/use-auth";

const AUTO_TRACK_STATUSES: DeliveryOrderStatus[] = [
  "rider_assigned",
  "en_route_pickup",
];

function shouldAutoOpenTracking(
  order: DeliveryOrder,
  prev?: DeliveryOrderStatus,
): boolean {
  if (!isActiveDelivery(order.status)) return false;
  if (!order.riderId && !order.riderName) return false;

  if (prev && isActiveDelivery(prev)) return false;

  if (prev && AUTO_TRACK_STATUSES.includes(order.status)) {
    return AUTO_TRACK_STATUSES.includes(order.status);
  }

  return (
    order.status === "rider_assigned" &&
    (!prev || prev === "pending" || prev === "confirmed")
  );
}

function notifyCustomerStatusChange(order: DeliveryOrder, prevStatus?: DeliveryOrderStatus) {
  if (prevStatus === order.status) return;

  if (order.status === "rider_assigned" && order.riderName) {
    notifyCityRun({
      title: "Rider assigned",
      body: `${order.riderName} is on your delivery. Opening live tracking…`,
      href: `/cityrun/order/${order.id}`,
      tag: `order-${order.id}-assigned`,
    });
    return;
  }

  if (order.status === "rider_assigned") {
    notifyCityRun({
      title: "Rider assigned",
      body: "A rider has been allocated to your delivery.",
      href: `/cityrun/order/${order.id}`,
      tag: `order-${order.id}-assigned`,
    });
    return;
  }

  if (prevStatus && prevStatus !== "pending") {
    notifyCityRun({
      title: "Delivery update",
      body: customerStatusLabels[order.status],
      href: `/cityrun/order/${order.id}`,
      tag: `order-${order.id}-${order.status}`,
    });
  }
}

function handleOrderUpdate(
  order: DeliveryOrder,
  prev: DeliveryOrderStatus | undefined,
  options: {
    pathname: string;
    router: ReturnType<typeof useRouter>;
    autoOpened: Set<string>;
  },
) {
  invalidateMyOrdersCache();
  notifyOrdersChanged(order);

  if (prev !== undefined && prev !== order.status) {
    notifyCustomerStatusChange(order, prev);
  }

  if (!shouldAutoOpenTracking(order, prev)) return;
  if (options.autoOpened.has(order.id)) return;

  const trackPath = `/cityrun/order/${order.id}`;
  if (options.pathname === trackPath) return;
  if (options.pathname.startsWith("/cityrun/admin")) return;
  if (options.pathname.startsWith("/cityrun/rider")) return;

  options.autoOpened.add(order.id);
  options.router.push(trackPath);
}

export function CustomerNotificationListener() {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const statusByOrder = useRef<Map<string, DeliveryOrderStatus>>(new Map());
  const initialized = useRef(false);
  const autoOpened = useRef(new Set<string>());

  useEffect(() => {
    if (loading || !user || pathname.startsWith("/cityrun/rider")) return;
    if (!isSupabaseBrowserConfigured()) return;

    const supabase = tryCreateClient();
    if (!supabase) return;

    let poll: number | undefined;
    let cancelled = false;

    async function syncOrders() {
      const { fetchMyOrdersCached } = await import("@/lib/city-run/my-orders-cache");
      const orders = await fetchMyOrdersCached();
      if (cancelled) return;

      for (const order of orders) {
        const prev = statusByOrder.current.get(order.id);
        if (initialized.current) {
          handleOrderUpdate(order, prev, {
            pathname,
            router,
            autoOpened: autoOpened.current,
          });
        }
        statusByOrder.current.set(order.id, order.status);
      }
      initialized.current = true;
    }

    void syncOrders();
    poll = window.setInterval(syncOrders, 12_000);

    const channel = supabase
      .channel(`customer_orders_${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "delivery_orders",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const order = rowToOrder(payload.new as DeliveryOrderRow);
          const prev = statusByOrder.current.get(order.id);
          if (initialized.current) {
            handleOrderUpdate(order, prev, {
              pathname,
              router,
              autoOpened: autoOpened.current,
            });
          }
          statusByOrder.current.set(order.id, order.status);
          initialized.current = true;
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      if (poll !== undefined) window.clearInterval(poll);
      supabase.removeChannel(channel);
    };
  }, [user, loading, pathname, router]);

  return null;
}
