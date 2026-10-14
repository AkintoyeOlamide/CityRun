import { NextResponse } from "next/server";
import { AdminAuthError, requireAdmin } from "@/lib/auth/admin";
import { listAllWalletTransactionsForAdmin } from "@/lib/city-run/wallets-store";
import type { AccountType } from "@/lib/city-run/types";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(request.url);
    const typeParam = searchParams.get("type");
    const accountType =
      typeParam === "individual" ||
      typeParam === "business" ||
      typeParam === "vendor"
        ? (typeParam as AccountType)
        : "all";

    const limitParam = Number(searchParams.get("limit"));
    const limit = Number.isFinite(limitParam) ? limitParam : 500;

    const transactions = await listAllWalletTransactionsForAdmin({
      accountType,
      limit,
    });

    return NextResponse.json(transactions);
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load wallet transactions" },
      { status: 500 },
    );
  }
}
