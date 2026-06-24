import fs from "fs";
import path from "path";
import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase/server";

export type PushAudience = "customer" | "rider";

export type StoredPushSubscription = {
  endpoint: string;
  p256dh: string;
  auth: string;
  audience: PushAudience;
  userId?: string;
  riderId?: string;
};

type PushSubscriptionRow = {
  endpoint: string;
  p256dh: string;
  auth: string;
  audience: PushAudience;
  user_id: string | null;
  rider_id: string | null;
};

const STORE_PATH = path.join(process.cwd(), ".city-run-push.json");

function canUseFileStore() {
  if (process.env.VERCEL === "1" || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return false;
  }
  return process.env.NODE_ENV === "development";
}

function readFileStore(): StoredPushSubscription[] {
  try {
    return JSON.parse(fs.readFileSync(STORE_PATH, "utf8")) as StoredPushSubscription[];
  } catch {
    return [];
  }
}

function writeFileStore(rows: StoredPushSubscription[]) {
  if (!canUseFileStore()) return;
  fs.writeFileSync(STORE_PATH, JSON.stringify(rows, null, 2));
}

function rowToStored(row: PushSubscriptionRow): StoredPushSubscription {
  return {
    endpoint: row.endpoint,
    p256dh: row.p256dh,
    auth: row.auth,
    audience: row.audience,
    userId: row.user_id ?? undefined,
    riderId: row.rider_id ?? undefined,
  };
}

export async function savePushSubscription(
  subscription: StoredPushSubscription,
): Promise<void> {
  if (!isSupabaseConfigured()) {
    const rows = readFileStore().filter((row) => row.endpoint !== subscription.endpoint);
    rows.push(subscription);
    writeFileStore(rows);
    return;
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      endpoint: subscription.endpoint,
      p256dh: subscription.p256dh,
      auth: subscription.auth,
      audience: subscription.audience,
      user_id: subscription.userId ?? null,
      rider_id: subscription.riderId ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "endpoint" },
  );

  if (error && canUseFileStore()) {
    const rows = readFileStore().filter((row) => row.endpoint !== subscription.endpoint);
    rows.push(subscription);
    writeFileStore(rows);
    return;
  }

  if (error) {
    throw new Error(
      error.message.includes("push_subscriptions")
        ? "Push subscriptions table missing. Run supabase/migrations/add_push_subscriptions.sql in Supabase SQL Editor."
        : error.message,
    );
  }
}

export async function removePushSubscription(endpoint: string): Promise<void> {
  if (!isSupabaseConfigured()) {
    writeFileStore(readFileStore().filter((row) => row.endpoint !== endpoint));
    return;
  }

  const supabase = createAdminClient();
  await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
}

export async function listPushSubscriptions(filter: {
  audience: PushAudience;
  userId?: string;
  riderId?: string;
}): Promise<StoredPushSubscription[]> {
  if (!isSupabaseConfigured()) {
    return readFileStore().filter((row) => {
      if (row.audience !== filter.audience) return false;
      if (filter.userId && row.userId !== filter.userId) return false;
      if (filter.riderId && row.riderId !== filter.riderId) return false;
      return true;
    });
  }

  const supabase = createAdminClient();
  let query = supabase
    .from("push_subscriptions")
    .select("endpoint,p256dh,auth,audience,user_id,rider_id")
    .eq("audience", filter.audience);

  if (filter.userId) query = query.eq("user_id", filter.userId);
  if (filter.riderId) query = query.eq("rider_id", filter.riderId);

  const { data, error } = await query;
  if (error) {
    if (canUseFileStore()) {
      return readFileStore().filter((row) => row.audience === filter.audience);
    }
    return [];
  }

  return (data as PushSubscriptionRow[]).map(rowToStored);
}

export async function listAllRiderPushSubscriptions(): Promise<StoredPushSubscription[]> {
  return listPushSubscriptions({ audience: "rider" });
}
