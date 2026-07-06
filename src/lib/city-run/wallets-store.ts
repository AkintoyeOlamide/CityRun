import { createAdminClient, assertServiceRoleConfigured } from "@/lib/supabase/server";
import type { WalletSummary, WalletTransaction } from "@/lib/city-run/types";

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

export async function getWalletOverview(userId: string) {
  const wallet = await ensureWallet(userId);
  const transactions = await listWalletTransactions(userId);
  return { wallet, transactions };
}
