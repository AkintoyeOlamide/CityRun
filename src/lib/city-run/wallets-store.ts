import { createAdminClient, assertServiceRoleConfigured } from "@/lib/supabase/server";
import type {
  AccountType,
  WalletSummary,
  WalletTransaction,
  AdminWalletTransaction,
  AdminWalletAccount,
} from "@/lib/city-run/types";

type WalletRow = {
  user_id: string;
  balance_kobo: number;
  currency: string;
  updated_at: string;
};

type WalletTransactionRow = {
  id: string;
  user_id: string;
  type: WalletTransaction["type"];
  amount_kobo: number;
  balance_after_kobo: number;
  order_id: string | null;
  description: string;
  created_at: string;
};

function mapWallet(row: WalletRow): WalletSummary {
  return {
    userId: row.user_id,
    balanceKobo: row.balance_kobo,
    currency: row.currency,
    updatedAt: row.updated_at,
  };
}

function mapTransaction(row: WalletTransactionRow): WalletTransaction {
  return {
    id: row.id,
    type: row.type,
    amountKobo: row.amount_kobo,
    balanceAfterKobo: row.balance_after_kobo,
    orderId: row.order_id ?? undefined,
    description: row.description,
    createdAt: row.created_at,
  };
}

export async function ensureWallet(userId: string): Promise<WalletSummary> {
  assertServiceRoleConfigured();
  const supabase = createAdminClient();

  const { data: existing, error: readError } = await supabase
    .from("wallets")
    .select("user_id, balance_kobo, currency, updated_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (readError) {
    throw new Error(readError.message);
  }

  if (existing) {
    return mapWallet(existing as WalletRow);
  }

  const { data: created, error: insertError } = await supabase
    .from("wallets")
    .insert({ user_id: userId })
    .select("user_id, balance_kobo, currency, updated_at")
    .single();

  if (insertError) {
    throw new Error(insertError.message);
  }

  return mapWallet(created as WalletRow);
}

export async function getWallet(userId: string): Promise<WalletSummary | null> {
  assertServiceRoleConfigured();
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("wallets")
    .select("user_id, balance_kobo, currency, updated_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? mapWallet(data as WalletRow) : null;
}

export async function listWalletTransactions(
  userId: string,
  limit = 12,
): Promise<WalletTransaction[]> {
  assertServiceRoleConfigured();
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("wallet_transactions")
    .select("id, user_id, type, amount_kobo, balance_after_kobo, order_id, description, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as WalletTransactionRow[]).map(mapTransaction);
}

export async function creditWallet(input: {
  userId: string;
  amountKobo: number;
  description: string;
  type?: Extract<WalletTransaction["type"], "topup" | "adjustment" | "refund">;
  orderId?: string;
}): Promise<{ wallet: WalletSummary; transaction: WalletTransaction }> {
  if (input.amountKobo <= 0) {
    throw new Error("Amount must be greater than zero.");
  }

  assertServiceRoleConfigured();
  const supabase = createAdminClient();
  const wallet = await ensureWallet(input.userId);
  const newBalance = wallet.balanceKobo + input.amountKobo;

  const { data: transaction, error: txError } = await supabase
    .from("wallet_transactions")
    .insert({
      user_id: input.userId,
      type: input.type ?? "topup",
      amount_kobo: input.amountKobo,
      balance_after_kobo: newBalance,
      order_id: input.orderId ?? null,
      description: input.description.trim() || "Wallet credit",
    })
    .select("id, user_id, type, amount_kobo, balance_after_kobo, order_id, description, created_at")
    .single();

  if (txError || !transaction) {
    throw new Error(txError?.message ?? "Could not record wallet transaction.");
  }

  const { data: updated, error: walletError } = await supabase
    .from("wallets")
    .update({
      balance_kobo: newBalance,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", input.userId)
    .select("user_id, balance_kobo, currency, updated_at")
    .single();

  if (walletError || !updated) {
    throw new Error(walletError?.message ?? "Could not update wallet balance.");
  }

  return {
    wallet: mapWallet(updated as WalletRow),
    transaction: mapTransaction(transaction as WalletTransactionRow),
  };
}

export async function debitWallet(input: {
  userId: string;
  amountKobo: number;
  description: string;
  orderId?: string;
}): Promise<{ wallet: WalletSummary; transaction: WalletTransaction }> {
  if (input.amountKobo <= 0) {
    throw new Error("Amount must be greater than zero.");
  }

  assertServiceRoleConfigured();
  const supabase = createAdminClient();
  const wallet = await ensureWallet(input.userId);

  if (wallet.balanceKobo < input.amountKobo) {
    throw new Error("Insufficient wallet balance.");
  }

  const newBalance = wallet.balanceKobo - input.amountKobo;

  const { data: transaction, error: txError } = await supabase
    .from("wallet_transactions")
    .insert({
      user_id: input.userId,
      type: "debit",
      amount_kobo: input.amountKobo,
      balance_after_kobo: newBalance,
      order_id: input.orderId ?? null,
      description: input.description.trim() || "Wallet debit",
    })
    .select("id, user_id, type, amount_kobo, balance_after_kobo, order_id, description, created_at")
    .single();

  if (txError || !transaction) {
    throw new Error(txError?.message ?? "Could not record wallet transaction.");
  }

  const { data: updated, error: walletError } = await supabase
    .from("wallets")
    .update({
      balance_kobo: newBalance,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", input.userId)
    .select("user_id, balance_kobo, currency, updated_at")
    .single();

  if (walletError || !updated) {
    throw new Error(walletError?.message ?? "Could not update wallet balance.");
  }

  return {
    wallet: mapWallet(updated as WalletRow),
    transaction: mapTransaction(transaction as WalletTransactionRow),
  };
}

export async function getWalletOverview(userId: string) {
  const wallet = await ensureWallet(userId);
  const transactions = await listWalletTransactions(userId);
  return { wallet, transactions };
}

export async function listWalletBalances(
  userIds: string[],
): Promise<Map<string, number>> {
  const all = await listAllWalletBalances();
  if (userIds.length === 0) return all;

  const map = new Map<string, number>();
  for (const id of userIds) {
    map.set(id, all.get(id) ?? 0);
  }
  return map;
}

/** Every wallet row — avoids PostgREST `.in()` limits when many accounts exist. */
export async function listAllWalletBalances(): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  assertServiceRoleConfigured();
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("wallets")
    .select("user_id, balance_kobo");

  if (error) {
    throw new Error(error.message);
  }

  for (const row of data ?? []) {
    map.set(row.user_id as string, row.balance_kobo as number);
  }

  return map;
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

async function loadProfilesForUsers(userIds: string[]) {
  const supabase = createAdminClient();
  const profileMap = new Map<
    string,
    { fullName: string; businessName: string; accountType: AccountType }
  >();

  for (const ids of chunk(userIds, 100)) {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, business_name, account_type")
      .in("id", ids);

    if (error) {
      throw new Error(error.message);
    }

    for (const row of data ?? []) {
      profileMap.set(row.id as string, {
        fullName: (row.full_name as string) ?? "",
        businessName: (row.business_name as string) ?? "",
        accountType: parseAccountTypeForAdmin(row.account_type),
      });
    }
  }

  return profileMap;
}

export async function listWalletAccountsForAdmin(options?: {
  accountType?: AccountType | "all";
  fundedOnly?: boolean;
}): Promise<AdminWalletAccount[]> {
  assertServiceRoleConfigured();
  const supabase = createAdminClient();
  const filter = options?.accountType ?? "all";
  const fundedOnly = options?.fundedOnly ?? false;

  let walletQuery = supabase
    .from("wallets")
    .select("user_id, balance_kobo, currency, updated_at")
    .order("balance_kobo", { ascending: false });

  if (fundedOnly) {
    walletQuery = walletQuery.gt("balance_kobo", 0);
  }

  const { data: walletRows, error: walletError } = await walletQuery;
  if (walletError) {
    throw new Error(walletError.message);
  }

  const wallets = walletRows ?? [];
  if (wallets.length === 0) return [];

  const userIds = wallets.map((row) => row.user_id as string);
  const profileMap = await loadProfilesForUsers(userIds);

  const emailMap = new Map<string, string>();
  for (const ids of chunk(userIds, 20)) {
    await Promise.all(
      ids.map(async (id) => {
        emailMap.set(id, await getUserEmailForAdmin(id));
      }),
    );
  }

  const missingProfileIds = userIds.filter((id) => !profileMap.has(id));
  const authMeta = new Map<
    string,
    { fullName: string; accountType: AccountType }
  >();

  for (const ids of chunk(missingProfileIds, 20)) {
    await Promise.all(
      ids.map(async (id) => {
        const admin = createAdminClient();
        const { data, error } = await admin.auth.admin.getUserById(id);
        if (error || !data.user) return;
        const meta = data.user.user_metadata ?? {};
        authMeta.set(id, {
          fullName:
            (typeof meta.full_name === "string" && meta.full_name) ||
            (typeof meta.fullName === "string" && meta.fullName) ||
            "",
          accountType: parseAccountTypeForAdmin(meta.account_type),
        });
      }),
    );
  }

  const accounts: AdminWalletAccount[] = wallets.map((row) => {
    const userId = row.user_id as string;
    const profile = profileMap.get(userId);
    const auth = authMeta.get(userId);
    const accountType = profile?.accountType ?? auth?.accountType ?? "individual";
    const accountEmail = emailMap.get(userId) ?? "";
    const accountName =
      profile?.businessName?.trim() ||
      profile?.fullName?.trim() ||
      auth?.fullName?.trim() ||
      accountEmail ||
      "Unknown account";

    return {
      userId,
      balanceKobo: row.balance_kobo as number,
      currency: (row.currency as string) ?? "NGN",
      updatedAt: (row.updated_at as string) ?? new Date().toISOString(),
      accountName,
      accountEmail,
      accountType,
      hasProfile: Boolean(profile),
    };
  });

  if (filter === "all") return accounts;
  return accounts.filter((account) => account.accountType === filter);
}

export async function listAllWalletTransactionsForAdmin(options?: {
  limit?: number;
  accountType?: AccountType | "all";
}): Promise<AdminWalletTransaction[]> {
  assertServiceRoleConfigured();
  const supabase = createAdminClient();
  const limit = Math.min(Math.max(options?.limit ?? 500, 1), 2000);

  const { data: txRows, error: txError } = await supabase
    .from("wallet_transactions")
    .select(
      "id, user_id, type, amount_kobo, balance_after_kobo, order_id, description, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (txError) {
    throw new Error(txError.message);
  }

  const rows = (txRows ?? []) as WalletTransactionRow[];
  if (rows.length === 0) return [];

  const userIds = [...new Set(rows.map((row) => row.user_id))];
  const profileMap = await loadProfilesForUsers(userIds);

  const missingProfileIds = userIds.filter((id) => !profileMap.has(id));
  const emailMap = new Map<string, string>();

  for (const ids of chunk(missingProfileIds, 20)) {
    await Promise.all(
      ids.map(async (id) => {
        emailMap.set(id, await getUserEmailForAdmin(id));
      }),
    );
  }

  for (const id of profileMap.keys()) {
    if (!emailMap.has(id)) {
      emailMap.set(id, await getUserEmailForAdmin(id));
    }
  }

  const filter = options?.accountType ?? "all";

  return rows
    .map((row) => {
      const profile = profileMap.get(row.user_id);
      const accountType = profile?.accountType ?? "individual";
      const accountName =
        profile?.businessName?.trim() ||
        profile?.fullName?.trim() ||
        emailMap.get(row.user_id) ||
        "Unknown account";

      return {
        ...mapTransaction(row),
        userId: row.user_id,
        accountName,
        accountEmail: emailMap.get(row.user_id) ?? "",
        accountType,
      };
    })
    .filter((tx) => filter === "all" || tx.accountType === filter);
}

function parseAccountTypeForAdmin(raw: unknown): AccountType {
  if (raw === "business") return "business";
  if (raw === "vendor") return "vendor";
  return "individual";
}

async function getUserEmailForAdmin(userId: string): Promise<string> {
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.getUserById(userId);
  if (error || !data.user?.email) return "";
  return data.user.email;
}
