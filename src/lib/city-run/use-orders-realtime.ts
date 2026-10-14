"use client";

import { useEffect } from "react";
import { isSupabaseBrowserConfigured } from "@/lib/supabase/client";
import { tryCreateClient } from "@/utils/supabase/client";
import type { DeliveryOrder } from "@/lib/city-run/types";

export function useOrdersRealtime(onChange: () => void) {
  useEffect(() => {
    if (!isSupabaseBrowserConfigured()) return;

    const supabase = tryCreateClient();
    if (!supabase) return;

    const channel = supabase
      .channel("delivery_orders_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "delivery_orders" },
        () => onChange(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [onChange]);
}

export function useOrderRealtime(
  orderId: string,
  onUpdate: (order: DeliveryOrder) => void,
) {
  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/cityrun/orders/${orderId}`);
      if (res.ok) onUpdate(await res.json());
    }

    load();
    const interval = setInterval(load, 8_000);
    return () => clearInterval(interval);
  }, [orderId, onUpdate]);
}
