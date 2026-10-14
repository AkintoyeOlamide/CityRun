import type { DeliveryOrder } from "@/lib/city-run/types";

let cache: { data: DeliveryOrder[]; at: number } | null = null;
let inflight: Promise<DeliveryOrder[]> | null = null;

const CACHE_MS = 8_000;
export const ORDERS_CHANGED_EVENT = "cityrun:orders-changed";

export function invalidateMyOrdersCache() {
  cache = null;
  inflight = null;
}

export function notifyOrdersChanged(order?: DeliveryOrder) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(ORDERS_CHANGED_EVENT, { detail: order ?? null }),
  );
}

/** Shared my-orders fetch — dedupes parallel calls within the cache window. */
export async function fetchMyOrdersCached(): Promise<DeliveryOrder[]> {
  if (cache && Date.now() - cache.at < CACHE_MS) {
    return cache.data;
  }

  if (inflight) return inflight;

  inflight = fetch("/api/cityrun/my-orders")
    .then((res) => (res.ok ? res.json() : []))
    .then((data: DeliveryOrder[]) => {
      cache = { data, at: Date.now() };
      return data;
    })
    .catch(() => [] as DeliveryOrder[])
    .finally(() => {
      inflight = null;
    });

  return inflight;
}
