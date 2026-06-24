"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/use-auth";
import {
  fetchMyOrdersCached,
  invalidateMyOrdersCache,
  ORDERS_CHANGED_EVENT,
} from "@/lib/city-run/my-orders-cache";
import { isActiveDelivery } from "@/lib/city-run/status-config";

export function useActiveDeliveryOrder() {
  const { user, loading: authLoading } = useAuth();
  const [orderId, setOrderId] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (authLoading && !user) return;

    if (!user) {
      setOrderId(null);
      setChecking(false);
      return;
    }

    let cancelled = false;

    async function refresh() {
      setChecking(true);
      const orders = await fetchMyOrdersCached();
      if (cancelled) return;
      const active = orders.find((o) => isActiveDelivery(o.status));
      setOrderId(active?.id ?? null);
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
    orderId,
    hasActiveTrip: Boolean(orderId),
    loading: (authLoading && !user) || checking,
  };
}
