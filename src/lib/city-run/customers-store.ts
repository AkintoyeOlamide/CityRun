import { createAdminClient, assertServiceRoleConfigured, isSupabaseConfigured } from "@/lib/supabase/server";
import type { ProfileRow } from "@/lib/auth/profile-store";
import { deleteOrdersByUserId } from "@/lib/city-run/orders-store";
import { getWallet } from "@/lib/city-run/wallets-store";
import { isActiveDelivery } from "@/lib/city-run/status-config";
import type {
  AccountType,
  AddressValue,
  CustomerAdminAccount,
  DeliveryOrder,
} from "@/lib/city-run/types";

const ACCOUNT_SELECT =
  "id, full_name, phone, account_type, business_name, nature_of_goods, business_address, login_password, created_at";

type AccountRow = ProfileRow & {
  created_at?: string | null;
};

function parseAccountType(raw: unknown): AccountType {
  if (raw === "business") return "business";
  if (raw === "vendor") return "vendor";
  return "individual";
}

async function getUserEmail(userId: string): Promise<string> {
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.getUserById(userId);
  if (error || !data.user?.email) return "";
  return data.user.email;
}

function orderStats(orders: DeliveryOrder[]) {
  return {
    orderCount: orders.length,
    completedCount: orders.filter((o) => o.status === "delivered").length,
    activeCount: orders.filter((o) => isActiveDelivery(o.status)).length,
    cancelledCount: orders.filter((o) => o.status === "cancelled").length,
  };
}

function rowToAccount(
  row: AccountRow,
  email: string,
  stats: ReturnType<typeof orderStats>,
): CustomerAdminAccount {
  const accountType = parseAccountType(row.account_type);
  const businessName = row.business_name?.trim() || undefined;
  const natureOfGoods = row.nature_of_goods?.trim() || undefined;
  const businessAddress = row.business_address?.formatted
    ? (row.business_address as AddressValue)
    : undefined;

  return {
    id: row.id,
    email,
    fullName: row.full_name,
    phone: row.phone,
    accountType,
    ...(businessName ? { businessName } : {}),
    ...(natureOfGoods ? { natureOfGoods } : {}),
    ...(businessAddress ? { businessAddress } : {}),
    loginPassword: row.login_password ?? null,
    createdAt: row.created_at ?? new Date().toISOString(),
    ...stats,
  };
}

async function loadOrdersForAccount(userId: string): Promise<DeliveryOrder[]> {
  assertServiceRoleConfigured();
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("delivery_orders")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const { rowToOrder } = await import("@/lib/city-run/db-mapper");
  return (data ?? []).map((row) => rowToOrder(row as import("@/lib/city-run/db-mapper").DeliveryOrderRow));
}

export async function listCustomerAccounts(options?: {
  accountType?: AccountType | "all";
}): Promise<CustomerAdminAccount[]> {
  if (!isSupabaseConfigured()) return [];

  assertServiceRoleConfigured();
  const supabase = createAdminClient();
  let query = supabase.from("profiles").select(ACCOUNT_SELECT).order("created_at", {
    ascending: false,
  });

  const filter = options?.accountType ?? "all";
  if (filter !== "all") {
    query = query.eq("account_type", filter);
  }

  let { data, error } = await query;
  let rows: AccountRow[];

  if (error && (error.code === "PGRST204" || error.message?.includes("account_type"))) {
    const fallback = await supabase
      .from("profiles")
      .select("id, full_name, phone, created_at")
      .order("created_at", { ascending: false });
    if (fallback.error) throw new Error(fallback.error.message);
    rows = (fallback.data ?? []) as AccountRow[];
  } else {
    if (error) throw new Error(error.message);
    rows = (data ?? []) as AccountRow[];
  }

  return Promise.all(
    rows.map(async (row) => {
      const email = await getUserEmail(row.id);
      const orders = await loadOrdersForAccount(row.id);
      return rowToAccount(row, email, orderStats(orders));
    }),
  );
}

export async function getCustomerAccount(
  userId: string,
): Promise<{ account: CustomerAdminAccount; orders: DeliveryOrder[] } | null> {
  if (!isSupabaseConfigured()) return null;

  assertServiceRoleConfigured();
  const supabase = createAdminClient();
  let { data, error } = await supabase
    .from("profiles")
    .select(ACCOUNT_SELECT)
    .eq("id", userId)
    .maybeSingle();

  let row = data as AccountRow | null;

  if (error && (error.code === "PGRST204" || error.message?.includes("column"))) {
    const fallback = await supabase
      .from("profiles")
      .select("id, full_name, phone, created_at")
      .eq("id", userId)
      .maybeSingle();
    row = fallback.data as AccountRow | null;
    error = fallback.error;
  }

  if (error || !row) return null;

  const email = await getUserEmail(userId);
  const orders = await loadOrdersForAccount(userId);
  const account = rowToAccount(row, email, orderStats(orders));
  const wallet = await getWallet(userId).catch(() => null);

  return {
    account: {
      ...account,
      walletBalanceKobo: wallet?.balanceKobo ?? 0,
    },
    orders: orders.sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    ),
  };
}

/** Delete auth user, profile (cascade), and all owned delivery orders. */
export async function deleteCustomerAccounts(
  ids: string[],
): Promise<{ deleted: string[]; errors: string[] }> {
  if (!isSupabaseConfigured()) {
    throw new Error("Account store unavailable. Configure Supabase.");
  }

  assertServiceRoleConfigured();
  const admin = createAdminClient();
  const deleted: string[] = [];
  const errors: string[] = [];

  for (const id of ids) {
    try {
      await deleteOrdersByUserId(id);
      const { error } = await admin.auth.admin.deleteUser(id);
      if (error) {
        errors.push(`${id}: ${error.message}`);
      } else {
        deleted.push(id);
      }
    } catch (err) {
      errors.push(
        `${id}: ${err instanceof Error ? err.message : "Delete failed"}`,
      );
    }
  }

  if (deleted.length === 0 && errors.length > 0) {
    throw new Error(errors[0] ?? "Could not delete account(s).");
  }

  return { deleted, errors };
}

export async function deleteCustomerAccount(userId: string): Promise<boolean> {
  const { deleted } = await deleteCustomerAccounts([userId]);
  return deleted.includes(userId);
}
