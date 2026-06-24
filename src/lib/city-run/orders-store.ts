import fs from "fs";
import path from "path";
import {
  createAdminClient,
  hasServiceRoleKey,
  isSupabaseConfigured,
  type SupabaseClient,
} from "@/lib/supabase/server";
import { createClient } from "@/utils/supabase/server";
import {
  draftToInsert,
  rowToOrder,
  type DeliveryOrderRow,
} from "@/lib/city-run/db-mapper";
import { appendOrderEvent } from "@/lib/city-run/order-events";
import { getRiderById, RIDER_LOCATION_MAX_AGE_MS } from "@/lib/city-run/riders-store";
import { activeDeliveryStatuses } from "@/lib/city-run/status-config";
import type {
  DeliveryOrder,
  DeliveryOrderDraft,
  DeliveryOrderStatus,
  RiderFleetEntry,
} from "@/lib/city-run/types";

const ORDERS_PATH = path.join(process.cwd(), ".city-run-orders.json");

/** Local dev only — Vercel/serverless filesystem is read-only (EROFS). */
function canUseFileStore() {
  if (process.env.VERCEL === "1" || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return false;
  }
  return process.env.NODE_ENV === "development";
}

function requireDatabaseOrFileStore(action: string): void {
  if (!isSupabaseConfigured() && !canUseFileStore()) {
    throw new Error(
      `${action} unavailable: Supabase database is not set up. Run supabase/schema.sql in your Supabase SQL Editor.`,
    );
  }
}

function readFileStore(): Map<string, DeliveryOrder> {
  try {
    const raw = fs.readFileSync(ORDERS_PATH, "utf8");
    const list = JSON.parse(raw) as DeliveryOrder[];
    return new Map(list.map((order) => [order.id, order]));
  } catch {
    return new Map();
  }
}

function writeFileStore(orders: Map<string, DeliveryOrder>) {
  if (!canUseFileStore()) {
    throw new Error(
      "Cannot save orders on this server. Configure Supabase and run supabase/schema.sql.",
    );
  }
  fs.writeFileSync(ORDERS_PATH, JSON.stringify([...orders.values()], null, 2));
}

function createOrderFile(draft: DeliveryOrderDraft): DeliveryOrder {
  const orders = readFileStore();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const order: DeliveryOrder = {
    ...draft,
    id,
    status: "pending",
    createdAt: now,
    updatedAt: now,
    ...(draft.userId ? { userId: draft.userId } : {}),
  };
  orders.set(id, order);
  writeFileStore(orders);
  return order;
}

function getOrderFile(id: string): DeliveryOrder | undefined {
  return readFileStore().get(id);
}

function listOrdersFile(userId?: string): DeliveryOrder[] {
  return [...readFileStore().values()]
    .filter((order) => !userId || order.userId === userId)
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
}

function updateOrderStatusFile(
  id: string,
  status: DeliveryOrderStatus,
  options?: {
    riderName?: string;
    riderPhone?: string;
    riderId?: string;
    proofOfDeliveryUrl?: string;
  },
): DeliveryOrder | undefined {
  const orders = readFileStore();
  const order = orders.get(id);
  if (!order) return undefined;

  const updated: DeliveryOrder = {
    ...order,
    status,
    updatedAt: new Date().toISOString(),
    ...(options?.riderName !== undefined ? { riderName: options.riderName } : {}),
    ...(options?.riderPhone !== undefined ? { riderPhone: options.riderPhone } : {}),
    ...(options?.riderId !== undefined ? { riderId: options.riderId } : {}),
    ...(options?.proofOfDeliveryUrl !== undefined
      ? { proofOfDeliveryUrl: options.proofOfDeliveryUrl }
      : {}),
  };
  orders.set(id, updated);
  writeFileStore(orders);
  return updated;
}

function updateRiderLocationFile(
  id: string,
  location: { lat: number; lng: number },
): DeliveryOrder | undefined {
  const orders = readFileStore();
  const order = orders.get(id);
  if (!order) return undefined;

  const updated: DeliveryOrder = {
    ...order,
    riderLocation: location,
    updatedAt: new Date().toISOString(),
  };
  orders.set(id, updated);
  writeFileStore(orders);
  return updated;
}

function isMissingTableError(error: { code?: string; message?: string }) {
  if (error.code === "PGRST205") return true;
  const msg = error.message?.toLowerCase() ?? "";
  return (
    msg.includes("could not find the table") ||
    (msg.includes("relation") && msg.includes("does not exist"))
  );
}

function isMissingColumnError(error: { code?: string; message?: string }) {
  return (
    error.code === "42703" ||
    error.code === "PGRST204" ||
    (error.message?.includes("column") ?? false)
  );
}

function formatSupabaseError(error: { code?: string; message?: string }) {
  if (isMissingTableError(error)) {
    return "Database table missing. Run supabase/schema.sql in your Supabase SQL Editor.";
  }
  if (error.message?.includes("delivery_orders_status_check")) {
    return "Database needs updating. Run supabase/migrations/add_delivery_status_steps.sql in Supabase SQL Editor.";
  }
  if (isMissingColumnError(error)) {
    if (error.message?.includes("fare_kobo")) {
      return "Database needs updating. Add fare_kobo to delivery_orders or run supabase/schema.sql.";
    }
    if (error.message?.includes("rider_phone")) {
      return "Run supabase/migrations/add_rider_phone_to_orders.sql in Supabase SQL Editor (optional — accept still works without it).";
    }
    return "Database schema is out of date. Run all files in supabase/migrations/ in Supabase SQL Editor.";
  }
  return error.message ?? "Database error";
}

function fallbackOrThrow<T>(fallback: () => T, error: { code?: string; message?: string }): T {
  if (canUseFileStore()) return fallback();
  throw new Error(formatSupabaseError(error));
}

/** Service role bypasses RLS; otherwise use the signed-in user's session from cookies. */
async function getCustomerSessionClient(
  explicit?: SupabaseClient,
): Promise<SupabaseClient> {
  if (explicit) return explicit;
  if (hasServiceRoleKey()) return createAdminClient();
  return createClient();
}

export async function createOrder(
  draft: DeliveryOrderDraft,
  options?: { supabase?: SupabaseClient },
): Promise<DeliveryOrder> {
  requireDatabaseOrFileStore("Order creation");
  if (!isSupabaseConfigured()) return createOrderFile(draft);

  const supabase = await getCustomerSessionClient(options?.supabase);
  const { data, error } = await supabase
    .from("delivery_orders")
    .insert(draftToInsert(draft))
    .select("*")
    .single();

  if (error) {
    return fallbackOrThrow(() => createOrderFile(draft), error);
  }
  const order = rowToOrder(data as DeliveryOrderRow);
  try {
    await appendOrderEvent(order.id, "pending", {
      actor: "customer",
      note: "Order placed",
      supabase,
    });
  } catch {
    // Order is saved — status history is optional
  }
  return order;
}

export async function attachOrderFare(
  orderId: string,
  fareKobo: number,
  options?: { supabase?: SupabaseClient },
): Promise<DeliveryOrder | undefined> {
  if (!isSupabaseConfigured()) {
    if (!canUseFileStore()) return undefined;
    const orders = readFileStore();
    const order = orders.get(orderId);
    if (!order) return undefined;
    const next: DeliveryOrder = {
      ...order,
      fareKobo,
      updatedAt: new Date().toISOString(),
    };
    orders.set(orderId, next);
    writeFileStore(orders);
    return next;
  }

  const supabase = await getCustomerSessionClient(options?.supabase);
  const { data, error } = await supabase
    .from("delivery_orders")
    .update({
      fare_kobo: fareKobo,
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId)
    .select("*")
    .maybeSingle();

  if (error) {
    if (isMissingColumnError(error)) {
      return getOrder(orderId, { supabase });
    }
    return fallbackOrThrow(() => attachOrderFare(orderId, fareKobo), error);
  }

  return data ? rowToOrder(data as DeliveryOrderRow) : undefined;
}

function isRecentRiderLocation(updatedAt?: string): boolean {
  if (!updatedAt) return false;
  return Date.now() - new Date(updatedAt).getTime() <= RIDER_LOCATION_MAX_AGE_MS;
}

async function enrichOrderWithRider(order: DeliveryOrder): Promise<DeliveryOrder> {
  if (!order.riderId) return order;

  const rider = await getRiderById(order.riderId);
  if (!rider) return order;

  const enriched: DeliveryOrder = {
    ...order,
    riderName: order.riderName ?? rider.fullName,
    riderPhone: order.riderPhone ?? rider.phone,
  };

  if (
    !enriched.riderLocation &&
    rider.lastLocation &&
    isRecentRiderLocation(rider.locationUpdatedAt)
  ) {
    enriched.riderLocation = rider.lastLocation;
  }

  return enriched;
}

export async function getOrder(
  id: string,
  options?: { supabase?: SupabaseClient },
): Promise<DeliveryOrder | undefined> {
  if (!isSupabaseConfigured()) {
    if (!canUseFileStore()) return undefined;
    const order = getOrderFile(id);
    return order ? enrichOrderWithRider(order) : undefined;
  }

  const supabase = await getCustomerSessionClient(options?.supabase);
  const { data, error } = await supabase
    .from("delivery_orders")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return fallbackOrThrow(() => getOrderFile(id), error);
  }
  const order = data ? rowToOrder(data as DeliveryOrderRow) : undefined;
  return order ? enrichOrderWithRider(order) : undefined;
}

export async function listOrders(): Promise<DeliveryOrder[]> {
  if (!isSupabaseConfigured()) {
    if (!canUseFileStore()) return [];
    return listOrdersFile();
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("delivery_orders")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return fallbackOrThrow(() => listOrdersFile(), error);
  }
  return (data as DeliveryOrderRow[]).map(rowToOrder);
}

export async function listAvailableOrders(riderId: string): Promise<DeliveryOrder[]> {
  const all = await listOrders();
  return all.filter(
    (o) =>
      o.riderId === riderId &&
      (o.status === "pending" || o.status === "confirmed"),
  );
}

export async function listOrdersForRider(
  riderId: string,
): Promise<DeliveryOrder[]> {
  if (!isSupabaseConfigured()) {
    if (!canUseFileStore()) return [];
    return listOrdersFile().filter((o) => o.riderId === riderId);
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("delivery_orders")
    .select("*")
    .eq("rider_id", riderId)
    .order("created_at", { ascending: false });

  if (error) {
    if (error.code === "42703") {
      return listOrdersFile().filter((o) => o.riderId === riderId);
    }
    return fallbackOrThrow(
      () => listOrdersFile().filter((o) => o.riderId === riderId),
      error,
    );
  }
  return (data as DeliveryOrderRow[]).map(rowToOrder);
}

async function enrichOrders(orders: DeliveryOrder[]): Promise<DeliveryOrder[]> {
  return Promise.all(orders.map((order) => enrichOrderWithRider(order)));
}

export async function listOrdersForUser(
  userId: string,
  options?: { supabase?: SupabaseClient },
): Promise<DeliveryOrder[]> {
  if (!isSupabaseConfigured()) {
    if (!canUseFileStore()) return [];
    return enrichOrders(listOrdersFile(userId));
  }

  const supabase = await getCustomerSessionClient(options?.supabase);
  const { data, error } = await supabase
    .from("delivery_orders")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    const fallback = fallbackOrThrow(() => listOrdersFile(userId), error);
    return enrichOrders(fallback);
  }
  return enrichOrders((data as DeliveryOrderRow[]).map(rowToOrder));
}

export async function updateOrderStatus(
  id: string,
  status: DeliveryOrderStatus,
  options?: {
    riderName?: string;
    riderPhone?: string;
    riderId?: string;
    proofOfDeliveryUrl?: string;
    actor?: string;
    note?: string;
  },
): Promise<DeliveryOrder | undefined> {
  if (!isSupabaseConfigured()) {
    if (!canUseFileStore()) {
      throw new Error("Orders database is not configured.");
    }
    return updateOrderStatusFile(id, status, options);
  }

  const supabase = createAdminClient();
  const patch: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  };
  if (options?.riderName !== undefined) patch.rider_name = options.riderName;
  if (options?.riderPhone !== undefined) patch.rider_phone = options.riderPhone;
  if (options?.riderId !== undefined) patch.rider_id = options.riderId;
  if (options?.proofOfDeliveryUrl !== undefined) {
    patch.proof_of_delivery_url = options.proofOfDeliveryUrl;
  }

  let { data, error } = await supabase
    .from("delivery_orders")
    .update(patch)
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error && isMissingColumnError(error) && "rider_phone" in patch) {
    const { rider_phone: _removed, ...patchWithoutPhone } = patch;
    ({ data, error } = await supabase
      .from("delivery_orders")
      .update(patchWithoutPhone)
      .eq("id", id)
      .select("*")
      .maybeSingle());
  }

  if (error) {
    return fallbackOrThrow(
      () => updateOrderStatusFile(id, status, options),
      error,
    );
  }
  const order = data ? rowToOrder(data as DeliveryOrderRow) : undefined;
  if (order) {
    await appendOrderEvent(id, status, {
      actor: options?.actor,
      note: options?.note,
    });
    return enrichOrderWithRider(order);
  }
  return undefined;
}

export async function updateRiderLocation(
  id: string,
  location: { lat: number; lng: number },
): Promise<DeliveryOrder | undefined> {
  if (!isSupabaseConfigured()) {
    if (!canUseFileStore()) {
      throw new Error("Orders database is not configured.");
    }
    return updateRiderLocationFile(id, location);
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("delivery_orders")
    .update({
      rider_location: location,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) {
    return fallbackOrThrow(() => updateRiderLocationFile(id, location), error);
  }
  return data ? rowToOrder(data as DeliveryOrderRow) : undefined;
}

export async function updateActiveRiderLocations(
  riderId: string,
  location: { lat: number; lng: number },
): Promise<number> {
  if (!isSupabaseConfigured()) {
    if (!canUseFileStore()) {
      throw new Error("Orders database is not configured.");
    }
    const orders = listOrdersFile().filter(
      (order) =>
        order.riderId === riderId &&
        activeDeliveryStatuses.includes(order.status),
    );
    for (const order of orders) {
      updateRiderLocationFile(order.id, location);
    }
    return orders.length;
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("delivery_orders")
    .update({
      rider_location: location,
      updated_at: new Date().toISOString(),
    })
    .eq("rider_id", riderId)
    .in("status", activeDeliveryStatuses)
    .select("id");

  if (error) {
    const orders = listOrdersFile().filter(
      (order) =>
        order.riderId === riderId &&
        activeDeliveryStatuses.includes(order.status),
    );
    for (const order of orders) {
      updateRiderLocationFile(order.id, location);
    }
    return orders.length;
  }

  return data?.length ?? 0;
}

function buildRiderFleetFromOrders(orders: DeliveryOrder[]): RiderFleetEntry[] {
  const byRider = new Map<string, RiderFleetEntry>();

  for (const order of orders) {
    if (!order.riderId || !activeDeliveryStatuses.includes(order.status)) continue;

    const entry: RiderFleetEntry = {
      riderId: order.riderId,
      riderName: order.riderName ?? "Rider",
      riderPhone: order.riderPhone ?? null,
      location: order.riderLocation,
      updatedAt: order.updatedAt,
      orderId: order.id,
      orderStatus: order.status,
      hasGps: Boolean(order.riderLocation),
      onDelivery: true,
    };

    const existing = byRider.get(order.riderId);
    if (!existing || new Date(order.updatedAt) > new Date(existing.updatedAt)) {
      byRider.set(order.riderId, entry);
    }
  }

  return [...byRider.values()].sort((a, b) =>
    a.riderName.localeCompare(b.riderName),
  );
}

export async function listActiveRiderFleet(): Promise<RiderFleetEntry[]> {
  if (!isSupabaseConfigured()) {
    if (!canUseFileStore()) return [];
    return buildRiderFleetFromOrders(listOrdersFile());
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("delivery_orders")
    .select(
      "id, status, rider_id, rider_name, rider_phone, rider_location, updated_at",
    )
    .not("rider_id", "is", null)
    .in("status", activeDeliveryStatuses)
    .order("updated_at", { ascending: false });

  if (error) {
    return buildRiderFleetFromOrders(listOrdersFile());
  }

  const orders = (data ?? []).map((row) =>
    rowToOrder(row as DeliveryOrderRow),
  );
  return buildRiderFleetFromOrders(orders);
}

export async function listAdminRiderFleet(): Promise<RiderFleetEntry[]> {
  const { listRidersWithRecentLocation } = await import(
    "@/lib/city-run/riders-store"
  );
  const [riderLocations, onDutyFromOrders] = await Promise.all([
    listRidersWithRecentLocation(),
    listActiveRiderFleet(),
  ]);

  const fleet = new Map<string, RiderFleetEntry>();

  for (const rider of riderLocations) {
    fleet.set(rider.riderId, { ...rider });
  }

  for (const orderEntry of onDutyFromOrders) {
    const existing = fleet.get(orderEntry.riderId);
    if (existing) {
      existing.onDelivery = true;
      existing.orderId = orderEntry.orderId;
      existing.orderStatus = orderEntry.orderStatus;
      if (!existing.riderPhone && orderEntry.riderPhone) {
        existing.riderPhone = orderEntry.riderPhone;
      }
      if (orderEntry.hasGps && orderEntry.location) {
        const orderTime = new Date(orderEntry.updatedAt).getTime();
        const riderTime = new Date(existing.updatedAt).getTime();
        if (!existing.hasGps || orderTime >= riderTime) {
          existing.location = orderEntry.location;
          existing.updatedAt = orderEntry.updatedAt;
          existing.hasGps = true;
        }
      }
    } else {
      fleet.set(orderEntry.riderId, { ...orderEntry, onDelivery: true });
    }
  }

  return [...fleet.values()].sort((a, b) =>
    a.riderName.localeCompare(b.riderName),
  );
}

const assignableStatuses: DeliveryOrderStatus[] = ["pending", "confirmed"];

function assignOrderToRiderFile(
  orderId: string,
  rider: {
    id: string;
    fullName: string;
    phone: string;
    lastLocation?: { lat: number; lng: number };
  },
  options?: { actor?: string; note?: string },
): DeliveryOrder {
  const orders = readFileStore();
  const order = orders.get(orderId);
  if (!order) {
    throw new Error("Order not found");
  }
  if (order.riderId && order.riderId !== rider.id) {
    throw new Error("Order already assigned to another rider");
  }
  if (!assignableStatuses.includes(order.status)) {
    throw new Error("This ride can no longer be assigned");
  }

  const updated = updateOrderStatusFile(orderId, "rider_assigned", {
    riderId: rider.id,
    riderName: rider.fullName,
    riderPhone: rider.phone,
  });
  if (!updated) throw new Error("Order not found");

  const withLocation = rider.lastLocation
    ? updateRiderLocationFile(orderId, rider.lastLocation) ?? updated
    : updated;

  void appendOrderEvent(orderId, "rider_assigned", {
    actor: options?.actor,
    note: options?.note ?? `Assigned to ${rider.fullName}`,
  });

  return withLocation;
}

/** Admin assigns a pending ride to one rider — exclusive, atomic when possible. */
export async function assignOrderToRider(
  orderId: string,
  riderId: string,
  options?: { actor?: string; note?: string },
): Promise<DeliveryOrder> {
  requireDatabaseOrFileStore("Order assignment");

  const rider = await getRiderById(riderId);
  if (!rider) throw new Error("Rider not found");
  if (!rider.active) throw new Error("Rider is not active");

  if (!isSupabaseConfigured()) {
    return assignOrderToRiderFile(orderId, rider, options);
  }

  const existing = await getOrder(orderId);
  if (!existing) throw new Error("Order not found");
  if (existing.riderId && existing.riderId !== riderId) {
    throw new Error("Order already assigned to another rider");
  }
  if (!assignableStatuses.includes(existing.status)) {
    throw new Error("This ride can no longer be assigned");
  }

  const supabase = createAdminClient();
  const patch: Record<string, unknown> = {
    rider_id: riderId,
    rider_name: rider.fullName,
    rider_phone: rider.phone,
    status: "rider_assigned",
    updated_at: new Date().toISOString(),
  };

  if (
    rider.lastLocation &&
    isRecentRiderLocation(rider.locationUpdatedAt)
  ) {
    patch.rider_location = rider.lastLocation;
  }

  let { data, error } = await supabase
    .from("delivery_orders")
    .update(patch)
    .eq("id", orderId)
    .is("rider_id", null)
    .in("status", assignableStatuses)
    .select("*")
    .maybeSingle();

  if (error && isMissingColumnError(error) && "rider_phone" in patch) {
    const { rider_phone: _removed, ...patchWithoutPhone } = patch;
    ({ data, error } = await supabase
      .from("delivery_orders")
      .update(patchWithoutPhone)
      .eq("id", orderId)
      .is("rider_id", null)
      .in("status", assignableStatuses)
      .select("*")
      .maybeSingle());
  }

  if (error) {
    return assignOrderToRiderFile(orderId, rider, options);
  }

  if (!data) {
    const current = await getOrder(orderId);
    if (current?.riderId === riderId && current.status === "rider_assigned") {
      return current;
    }
    if (current?.riderId) {
      throw new Error("Order already assigned to another rider");
    }
    throw new Error("This ride can no longer be assigned");
  }

  const order = rowToOrder(data as DeliveryOrderRow);
  await appendOrderEvent(orderId, "rider_assigned", {
    actor: options?.actor,
    note: options?.note ?? `Assigned to ${rider.fullName}`,
  });
  return enrichOrderWithRider(order);
}

function deleteOrdersFile(ids: string[]): string[] {
  const orders = readFileStore();
  const deleted: string[] = [];
  for (const id of ids) {
    if (orders.delete(id)) deleted.push(id);
  }
  if (deleted.length > 0) writeFileStore(orders);
  return deleted;
}

/** Permanently remove orders by id. Related events cascade in Supabase. */
export async function deleteOrders(ids: string[]): Promise<{ deleted: string[] }> {
  const unique = [...new Set(ids.map((id) => id.trim()).filter(Boolean))];
  if (unique.length === 0) return { deleted: [] };

  requireDatabaseOrFileStore("Order deletion");

  if (!isSupabaseConfigured()) {
    return { deleted: deleteOrdersFile(unique) };
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("delivery_orders")
    .delete()
    .in("id", unique)
    .select("id");

  if (error) {
    if (canUseFileStore()) {
      return { deleted: deleteOrdersFile(unique) };
    }
    throw new Error(formatSupabaseError(error));
  }

  return { deleted: (data ?? []).map((row) => (row as { id: string }).id) };
}

/** Remove all delivery orders owned by a customer before deleting their auth account. */
export async function deleteOrdersByUserId(userId: string): Promise<string[]> {
  if (!userId.trim()) return [];

  if (!isSupabaseConfigured()) {
    if (!canUseFileStore()) return [];
    const ids = listOrdersFile(userId).map((order) => order.id);
    return deleteOrdersFile(ids);
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("delivery_orders")
    .select("id")
    .eq("user_id", userId);

  if (error) {
    if (canUseFileStore()) {
      const ids = listOrdersFile(userId).map((order) => order.id);
      return deleteOrdersFile(ids);
    }
    throw new Error(formatSupabaseError(error));
  }

  const ids = (data ?? []).map((row) => (row as { id: string }).id);
  if (ids.length === 0) return [];
  const { deleted } = await deleteOrders(ids);
  return deleted;
}
