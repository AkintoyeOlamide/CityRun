import { createAdminClient, assertServiceRoleConfigured, isSupabaseConfigured } from "@/lib/supabase/server";
import type { ProfileRow } from "@/lib/auth/profile-store";
import { deleteOrdersByUserId } from "@/lib/city-run/orders-store";
import { getWallet, listAllWalletBalances } from "@/lib/city-run/wallets-store";
import { isActiveDelivery } from "@/lib/city-run/status-config";
import type {
  AccountType,
  AddressValue,
  CustomerAdminAccount,
  DeliveryOrder,
  DeliveryOrderStatus,
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
  return orderStatsFromStatuses(orders.map((order) => order.status));
}

function orderStatsFromStatuses(statuses: string[]) {
  return {
    orderCount: statuses.length,
    completedCount: statuses.filter((status) => status === "delivered").length,
    activeCount: statuses.filter((status) =>
      isActiveDelivery(status as DeliveryOrderStatus),
    ).length,
    cancelledCount: statuses.filter((status) => status === "cancelled").length,
  };
}

const EMPTY_ORDER_STATS = {
  orderCount: 0,
  completedCount: 0,
  activeCount: 0,
  cancelledCount: 0,
};

type AuthUserSummary = {
  email: string;
  createdAt: string;
  meta: Record<string, unknown>;
};

async function loadAuthUserMap(): Promise<Map<string, AuthUserSummary>> {
  const admin = createAdminClient();
  const map = new Map<string, AuthUserSummary>();
  let page = 1;

  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) {
      throw new Error(error.message);
    }

    for (const user of data.users) {
      map.set(user.id, {
        email: user.email ?? "",
        createdAt: user.created_at ?? new Date().toISOString(),
        meta: (user.user_metadata ?? {}) as Record<string, unknown>,
      });
    }

    if (data.users.length < 1000) break;
    page += 1;
  }

  return map;
}

async function loadOrderStatsByUser(): Promise<Map<string, ReturnType<typeof orderStatsFromStatuses>>> {
  assertServiceRoleConfigured();
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("delivery_orders")
    .select("user_id, status")
    .not("user_id", "is", null);

  if (error) {
    throw new Error(error.message);
  }

  const statusesByUser = new Map<string, string[]>();
  for (const row of data ?? []) {
    const userId = row.user_id as string;
    const statuses = statusesByUser.get(userId) ?? [];
    statuses.push(row.status as string);
    statusesByUser.set(userId, statuses);
  }

  const statsMap = new Map<string, ReturnType<typeof orderStatsFromStatuses>>();
  for (const [userId, statuses] of statusesByUser) {
    statsMap.set(userId, orderStatsFromStatuses(statuses));
  }

  return statsMap;
}

async function loadAllProfileRows(): Promise<AccountRow[]> {
  assertServiceRoleConfigured();
  const supabase = createAdminClient();
  const query = supabase.from("profiles").select(ACCOUNT_SELECT).order("created_at", {
    ascending: false,
  });

  const { data, error } = await query;

  if (error && (error.code === "PGRST204" || error.message?.includes("account_type"))) {
    const fallback = await supabase
      .from("profiles")
      .select("id, full_name, phone, created_at")
      .order("created_at", { ascending: false });
    if (fallback.error) throw new Error(fallback.error.message);
    return (fallback.data ?? []) as AccountRow[];
  }

  if (error) throw new Error(error.message);
  return (data ?? []) as AccountRow[];
}

function authMetaString(meta: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const value = meta[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function accountFromAuthUser(
  userId: string,
  auth: AuthUserSummary,
  stats: ReturnType<typeof orderStatsFromStatuses>,
  walletBalanceKobo: number,
): CustomerAdminAccount {
  return {
    id: userId,
    email: auth.email,
    fullName: authMetaString(auth.meta, "full_name", "fullName"),
    phone: authMetaString(auth.meta, "phone"),
    accountType: parseAccountType(auth.meta.account_type),
    loginPassword: null,
    createdAt: auth.createdAt,
    ...stats,
    walletBalanceKobo,
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

  const filter = options?.accountType ?? "all";

  const [profileRows, walletBalances, orderStatsMap, authUsers] = await Promise.all([
    loadAllProfileRows(),
    listAllWalletBalances(),
    loadOrderStatsByUser(),
    loadAuthUserMap(),
  ]);

  const profileMap = new Map(profileRows.map((row) => [row.id, row]));
  const allUserIds = new Set<string>([
    ...profileMap.keys(),
    ...walletBalances.keys(),
    ...orderStatsMap.keys(),
    ...authUsers.keys(),
  ]);

  const accounts: CustomerAdminAccount[] = [];

  for (const userId of allUserIds) {
    const row = profileMap.get(userId);
    const auth = authUsers.get(userId);
    const stats = orderStatsMap.get(userId) ?? EMPTY_ORDER_STATS;
    const walletBalanceKobo = walletBalances.get(userId) ?? 0;

    if (row) {
      accounts.push({
        ...rowToAccount(row, auth?.email ?? "", stats),
        walletBalanceKobo,
      });
      continue;
    }

    if (!auth) continue;

    accounts.push(accountFromAuthUser(userId, auth, stats, walletBalanceKobo));
  }

  const filtered =
    filter === "all" ? accounts : accounts.filter((account) => account.accountType === filter);

  return filtered.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export async function getCustomerAccount(
  userId: string,
): Promise<{ account: CustomerAdminAccount; orders: DeliveryOrder[] } | null> {
  if (!isSupabaseConfigured()) return null;

  assertServiceRoleConfigured();
  const supabase = createAdminClient();
  const { data, error: initialError } = await supabase
    .from("profiles")
    .select(ACCOUNT_SELECT)
    .eq("id", userId)
    .maybeSingle();

  let error = initialError;
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

  if (error || !row) {
    const admin = createAdminClient();
    const { data: authData, error: authError } = await admin.auth.admin.getUserById(userId);
    if (authError || !authData.user) return null;

    const auth: AuthUserSummary = {
      email: authData.user.email ?? "",
      createdAt: authData.user.created_at ?? new Date().toISOString(),
      meta: (authData.user.user_metadata ?? {}) as Record<string, unknown>,
    };

    const orders = await loadOrdersForAccount(userId);
    const wallet = await getWallet(userId).catch(() => null);
    const account = accountFromAuthUser(
      userId,
      auth,
      orderStats(orders),
      wallet?.balanceKobo ?? 0,
    );

    return {
      account,
      orders: orders.sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      ),
    };
  }

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
