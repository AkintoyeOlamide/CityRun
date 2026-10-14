"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { isSupabaseBrowserConfigured } from "@/lib/supabase/client";
import { tryCreateClient } from "@/utils/supabase/client";
import { rowToOrder, type DeliveryOrderRow } from "@/lib/city-run/db-mapper";
import { isActiveDelivery } from "@/lib/city-run/status-config";
import type { DeliveryOrder } from "@/lib/city-run/types";

type LocationPayload = {
  riderLocation: { lat: number; lng: number } | null;
  status: DeliveryOrder["status"];
  updatedAt: string;
  riderName: string | null;
};

const LOCATION_POLL_MS = 2_000;
const ORDER_POLL_MS = 15_000;
const HIDDEN_POLL_MULTIPLIER = 2;

async function safeFetchJson<T>(url: string, signal?: AbortSignal): Promise<T | null> {
  try {
    const res = await fetch(url, { cache: "no-store", signal });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return null;
    }
    return null;
  }
}

function shouldTrackLocation(order: DeliveryOrder | null | undefined) {
  if (!order) return false;
  return isActiveDelivery(order.status) || Boolean(order.riderId);
}

export function useLiveOrderTracking(orderId: string, enabled = true) {
  const [order, setOrder] = useState<DeliveryOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [locationTick, setLocationTick] = useState(0);
  const orderRef = useRef<DeliveryOrder | null>(null);
  const mountedRef = useRef(true);

  orderRef.current = order;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const applyLocationPayload = useCallback((body: LocationPayload) => {
    setLocationTick((n) => n + 1);
    setOrder((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        status: body.status,
        updatedAt: body.updatedAt,
        ...(body.riderName ? { riderName: body.riderName } : {}),
        ...(body.riderLocation
          ? { riderLocation: body.riderLocation }
          : {}),
      };
    });
  }, []);

  const applyOrderRow = useCallback((row: DeliveryOrderRow) => {
    const next = rowToOrder(row);
    setOrder((prev) => {
      if (!prev) return next;
      return {
        ...next,
        riderName: next.riderName ?? prev.riderName,
        riderPhone: next.riderPhone ?? prev.riderPhone,
        riderLocation: next.riderLocation ?? prev.riderLocation,
      };
    });
    setLoading(false);
  }, []);

  const pollLocation = useCallback(async (signal?: AbortSignal) => {
    if (!enabled || !orderId) return;
    const current = orderRef.current;
    if (!shouldTrackLocation(current)) return;

    const body = await safeFetchJson<LocationPayload>(
      `/api/cityrun/orders/${orderId}/location`,
      signal,
    );
    if (!body || !mountedRef.current) return;

    applyLocationPayload(body);
  }, [orderId, enabled, applyLocationPayload]);

  const loadOrder = useCallback(async (signal?: AbortSignal) => {
    if (!enabled || !orderId) return;

    const next = await safeFetchJson<DeliveryOrder>(
      `/api/cityrun/orders/${orderId}`,
      signal,
    );
    if (!mountedRef.current) return;

    if (next) {
      setOrder(next);
      if (shouldTrackLocation(next)) {
        void pollLocation(signal);
      }
    }
    setLoading(false);
  }, [orderId, enabled, pollLocation]);

  useEffect(() => {
    if (!enabled || !orderId) {
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    void loadOrder(controller.signal);
    return () => controller.abort();
  }, [loadOrder, enabled, orderId]);

  useEffect(() => {
    if (!enabled || !orderId) return;

    const controller = new AbortController();
    const { signal } = controller;

    function pollMs(base: number) {
      return document.hidden ? base * HIDDEN_POLL_MULTIPLIER : base;
    }

    let locationInterval: number | undefined;
    let orderInterval: number | undefined;

    function schedule() {
      if (locationInterval) window.clearInterval(locationInterval);
      if (orderInterval) window.clearInterval(orderInterval);

      const current = orderRef.current;
      if (!shouldTrackLocation(current)) {
        orderInterval = window.setInterval(() => {
          void loadOrder(signal);
        }, pollMs(ORDER_POLL_MS));
        return;
      }

      void pollLocation(signal);
      locationInterval = window.setInterval(() => {
        void pollLocation(signal);
      }, pollMs(LOCATION_POLL_MS));
      orderInterval = window.setInterval(() => {
        void loadOrder(signal);
      }, pollMs(ORDER_POLL_MS));
    }

    schedule();

    const onVisibility = () => {
      schedule();
      if (document.visibilityState === "visible" && shouldTrackLocation(orderRef.current)) {
        void pollLocation(signal);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      controller.abort();
      document.removeEventListener("visibilitychange", onVisibility);
      if (locationInterval) window.clearInterval(locationInterval);
      if (orderInterval) window.clearInterval(orderInterval);
    };
  }, [order?.status, order?.riderId, loadOrder, pollLocation, enabled, orderId]);

  useEffect(() => {
    if (!enabled || !orderId || !isSupabaseBrowserConfigured()) return;

    const supabase = tryCreateClient();
    if (!supabase) return;

    const channel = supabase
      .channel(`order_tracking_${orderId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "delivery_orders",
          filter: `id=eq.${orderId}`,
        },
        (payload) => {
          applyOrderRow(payload.new as DeliveryOrderRow);
          void pollLocation();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId, applyOrderRow, pollLocation, enabled]);

  return { order, loading, locationTick, reload: loadOrder };
}
