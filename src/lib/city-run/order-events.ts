import {
  createAdminClient,
  hasServiceRoleKey,
  isSupabaseConfigured,
  type SupabaseClient,
} from "@/lib/supabase/server";
import { createClient } from "@/utils/supabase/server";
import type { DeliveryOrderStatus } from "@/lib/city-run/types";

export type DeliveryOrderEvent = {
  id: string;
  orderId: string;
  status: DeliveryOrderStatus;
  actor?: string;
  note?: string;
  createdAt: string;
};

type EventRow = {
  id: string;
  order_id: string;
  status: DeliveryOrderStatus;
  actor: string | null;
  note: string | null;
  created_at: string;
};

function rowToEvent(row: EventRow): DeliveryOrderEvent {
  return {
    id: row.id,
    orderId: row.order_id,
    status: row.status,
    actor: row.actor ?? undefined,
    note: row.note ?? undefined,
    createdAt: row.created_at,
  };
}

async function getEventWriteClient(
  explicit?: SupabaseClient,
): Promise<SupabaseClient> {
  if (explicit) return explicit;
  if (hasServiceRoleKey()) return createAdminClient();
  return createClient();
}

export async function appendOrderEvent(
  orderId: string,
  status: DeliveryOrderStatus,
  options?: { actor?: string; note?: string; supabase?: SupabaseClient },
): Promise<void> {
  if (!isSupabaseConfigured()) return;

  const supabase = await getEventWriteClient(options?.supabase);
  const { error } = await supabase.from("delivery_order_events").insert({
    order_id: orderId,
    status,
    actor: options?.actor ?? null,
    note: options?.note ?? null,
  });

  if (error) {
    if (error.code === "PGRST205") return;
    if (error.message?.includes("row-level security")) return;
    const msg = (error.message ?? "").toLowerCase();
    if (
      error.code === "PGRST204" ||
      error.code === "42703" ||
      error.code === "42P01" ||
      msg.includes("does not exist") ||
      msg.includes("schema cache")
    ) {
      return;
    }
    throw new Error(error.message);
  }
}

export async function listOrderEvents(
  orderId: string,
): Promise<DeliveryOrderEvent[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = hasServiceRoleKey() ? createAdminClient() : await createClient();
  const { data, error } = await supabase
    .from("delivery_order_events")
    .select("*")
    .eq("order_id", orderId)
    .order("created_at", { ascending: true });

  if (error) {
    if (error.code === "PGRST205") return [];
    throw new Error(error.message);
  }

  return (data as EventRow[]).map(rowToEvent);
}
