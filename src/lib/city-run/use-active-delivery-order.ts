"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/use-auth";
import {
  fetchMyOrdersCached,
  invalidateMyOrdersCache,
  ORDERS_CHANGED_EVENT,
} from "@/lib/city-run/my-orders-cache";
import { isActiveDelivery } from "@/lib/city-run/status-config";
import type { DeliveryOrder } from "@/lib/city-run/types";

function sortByRecent(orders: DeliveryOrder[]) {
  return [...orders].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}

export function pickActiveOrders(orders: DeliveryOrder[]): DeliveryOrder[] {
  return sortByRecent(orders.filter((o) => isActiveDelivery(o.status)));
}

export function useActiveDeliveryOrders() {
  const { user, loading: authLoading } = useAuth();
  const [activeOrders, setActiveOrders] = useState<DeliveryOrder[]>([]);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (authLoading && !user) return;

    if (!user) {
      setActiveOrders([]);
      setChecking(false);
      return;
    }

    let cancelled = false;

    async function refresh() {
      setChecking(true);
      const orders = await fetchMyOrdersCached();
      if (cancelled) return;
      setActiveOrders(pickActiveOrders(orders));
      setChecking(false);
    }

    void refresh();

    function onOrdersChanged() {
      invalidateMyOrdersCache();
      void refresh();
    }

    window.addEventListener(ORDERS_CHANGED_EVENT, onOrdersChanged);
    return () => {
      cancelled = true;
      window.removeEventListener(ORDERS_CHANGED_EVENT, onOrdersChanged);
    };
  }, [user, authLoading]);

  return {
    activeOrders,
    orderId: activeOrders[0]?.id ?? null,
    hasActiveTrip: activeOrders.length > 0,
    loading: (authLoading && !user) || checking,
  };
}

/** @deprecated Prefer useActiveDeliveryOrders for multi-trip support. */
export function useActiveDeliveryOrder() {
  const { orderId, hasActiveTrip, loading } = useActiveDeliveryOrders();
  return { orderId, hasActiveTrip, loading };
}
